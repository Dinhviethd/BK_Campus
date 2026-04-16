import axios from 'axios';
import { AppError } from '@/utils/error.response';
import { postRepository } from '@/modules/posting/post.repository';
import { matchRepository } from '@/modules/posting/match.repository';
import { match_request_status, post_type } from '@/constants/constants';
import {
  AiMatchingCallbackDTO,
  aiMatchingRequestSchema,
  aiMatchingResponseSchema,
} from '@/modules/posting/matching.schema';
import { MatchRequest } from '@/modules/posting/models/match_request.model';

export class MatchingService {
  async createMatchRequest(input: {
    lostPostId: string;
    userId: string;
  }): Promise<MatchRequest> {
    const post = await postRepository.findById(input.lostPostId);
    if (!post) {
      throw new AppError(404, 'Bài viết không tồn tại');
    }

    if (post.type !== post_type.lost) {
      throw new AppError(400, 'Chỉ được bật AI tìm kiếm cho bài viết loại LOST');
    }

    const isOwner = await postRepository.isOwner(input.lostPostId, input.userId);
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền bật AI tìm kiếm cho bài viết này');
    }

    const request = await matchRepository.createRequest({
      lostPostId: input.lostPostId,
      userId: input.userId,
    });

    await this.dispatchMatchingRequest({
      requestId: request.id,
      lostPostId: input.lostPostId,
      isRetry: false,
    });

    const latestRequest = await matchRepository.findRequestById(request.id);
    if (!latestRequest) {
      throw new AppError(500, 'Không thể tải lại match request sau khi tạo');
    }

    return latestRequest;
  }

  async handleMatchingCallback(data: AiMatchingCallbackDTO): Promise<{
    retried: boolean;
    request: MatchRequest | null;
    candidatesCreated: number;
  }> {
    const request = await matchRepository.findRequestById(data.request_id);
    if (!request) {
      throw new AppError(404, 'Match request không tồn tại');
    }

    if (request.lostPost.id !== data.lost_post_id) {
      throw new AppError(400, 'lost_post_id không khớp với request_id');
    }

    if (data.status === 'FAILED') {
      await this.dispatchMatchingRequest({
        requestId: request.id,
        lostPostId: request.lostPost.id,
        isRetry: true,
      });

      const latestRequest = await matchRepository.findRequestById(request.id);
      return { retried: true, request: latestRequest, candidatesCreated: 0 };
    }

    const candidates = data.candidates ?? [];
    await matchRepository.replaceCandidates(
      request.id,
      candidates.map((candidate) => ({
        foundPostId: candidate.found_post_id,
        similarityScore: candidate.similarity_score,
      }))
    );

    const updatedRequest = await matchRepository.updateRequestStatus(
      request.id,
      match_request_status.completed,
      new Date()
    );

    return {
      retried: false,
      request: updatedRequest,
      candidatesCreated: candidates.length,
    };
  }

  async getScanState(userId: string): Promise<{
    isScanning: boolean;
    request: MatchRequest | null;
  }> {
    const request = await matchRepository.findLatestScanningRequestByUser(userId);
    return {
      isScanning: !!request,
      request,
    };
  }

  private async dispatchMatchingRequest(input: {
    requestId: string;
    lostPostId: string;
    isRetry: boolean;
  }): Promise<void> {
    const matchingUrl = process.env.AI_MATCHING_URL?.trim();
    if (!matchingUrl) {
      throw new AppError(500, 'AI_MATCHING_URL chưa được cấu hình');
    }

    const explicitCallbackUrl = process.env.MATCHING_WEBHOOK_CALLBACK_URL?.trim();
    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL?.trim();
    const callbackUrl =
      explicitCallbackUrl ||
      (backendPublicUrl
        ? `${backendPublicUrl.replace(/\/$/, '')}/api/webhook/matching/history`
        : null);

    if (!callbackUrl) {
      throw new AppError(500, 'BACKEND_PUBLIC_URL hoặc MATCHING_WEBHOOK_CALLBACK_URL chưa được cấu hình');
    }

    const payload = aiMatchingRequestSchema.parse({
      request_id: input.requestId,
      lost_post_id: input.lostPostId,
      callback_url: callbackUrl,
    });

    const timeoutMs = Number(process.env.AI_MATCHING_TIMEOUT_MS || 15000);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const authToken = process.env.AI_MATCHING_AUTH_TOKEN || process.env.AI_SERVICE_AUTH_TOKEN;
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    try {
      const response = await axios.post(matchingUrl, payload, {
        headers,
        timeout: timeoutMs,
      });

      const parsed = aiMatchingResponseSchema.parse(response.data);
      if (parsed.request_id !== input.requestId) {
        throw new AppError(502, 'AI matching response trả về request_id không khớp');
      }

      await matchRepository.updateRequestStatus(input.requestId, match_request_status.scanning);
    } catch (error) {
      const action = input.isRetry ? 'retry' : 'request';
      throw new AppError(502, `Không thể gửi ${action} tới AI matching service`);
    }
  }
}

export const matchingService = new MatchingService();
