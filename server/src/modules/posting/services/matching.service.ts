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
import { publishPostEvent } from '@/modules/realtime/post-realtime.publisher';

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

    const foundPostIds = candidates.map((candidate) => candidate.found_post_id);
    const foundPosts = await postRepository.findByIds(foundPostIds);
    const foundPostMap = new Map(foundPosts.map((post) => [post.id, post]));

    const matches = candidates
      .map((candidate) => {
        const foundPost = foundPostMap.get(candidate.found_post_id);
        if (!foundPost) {
          return null;
        }

        return {
          post: foundPost,
          similarity_score: candidate.similarity_score,
        };
      })
      .filter((item): item is { post: typeof foundPosts[number]; similarity_score: number } => !!item);

    await this.publishMatchingRealtimeSafely({
      lostPostId: request.lostPost.id,
      requestId: request.id,
      totalCandidates: candidates.length,
      matches,
    });

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

  async getLatestPendingResult(userId: string): Promise<{
    requestId: string;
    lostPostId: string;
    totalCandidates: number;
    matches: Array<{ post: unknown; similarity_score: number }>;
  } | null> {
    const request = await matchRepository.findLatestCompletedRequestWithPendingCandidatesByUser(userId);
    if (!request || !request.candidates || request.candidates.length === 0) {
      return null;
    }

    const foundPostIds = request.candidates.map((candidate) => candidate.foundPost.id);
    const foundPosts = await postRepository.findByIds(foundPostIds);
    const foundPostMap = new Map(foundPosts.map((post) => [post.id, post]));

    const matches = request.candidates
      .map((candidate) => {
        const foundPost = foundPostMap.get(candidate.foundPost.id);
        if (!foundPost) {
          return null;
        }

        return {
          post: foundPost,
          similarity_score: candidate.similarityScore,
        };
      })
      .filter((item): item is { post: typeof foundPosts[number]; similarity_score: number } => !!item);

    return {
      requestId: request.id,
      lostPostId: request.lostPost.id,
      totalCandidates: matches.length,
      matches,
    };
  }

  async confirmCandidate(input: {
    userId: string;
    requestId: string;
    foundPostId: string;
  }): Promise<void> {
    const request = await matchRepository.findRequestById(input.requestId);
    if (!request) {
      throw new AppError(404, 'Match request không tồn tại');
    }

    if (String(request.user.idUser) !== String(input.userId)) {
      throw new AppError(403, 'Bạn không có quyền xác nhận kết quả matching này');
    }

    if (request.status !== match_request_status.completed) {
      throw new AppError(400, 'Match request chưa hoàn tất, không thể xác nhận');
    }

    const candidate = await matchRepository.findPendingCandidate(input.requestId, input.foundPostId);
    if (!candidate) {
      throw new AppError(404, 'Candidate không tồn tại hoặc đã được xác nhận trước đó');
    }

    await matchRepository.confirmCandidateSelection(input.requestId, input.foundPostId);
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

  private async publishMatchingRealtimeSafely(input: {
    lostPostId: string;
    requestId: string;
    totalCandidates: number;
    matches: Array<{ post: unknown; similarity_score: number }>;
  }): Promise<void> {
    try {
      await publishPostEvent({
        postId: input.lostPostId,
        eventType: 'MATCHING_CANDIDATES_READY',
        post: {
          request_id: input.requestId,
          lost_post_id: input.lostPostId,
          total_candidates: input.totalCandidates,
          matches: input.matches,
        },
      });
    } catch (error) {
      console.error('[Realtime] Failed to publish matching event', {
        requestId: input.requestId,
        lostPostId: input.lostPostId,
        error,
      });
    }
  }
}

export const matchingService = new MatchingService();
