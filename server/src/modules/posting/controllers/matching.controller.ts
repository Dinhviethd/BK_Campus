import { Request, Response } from 'express';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponse } from '@/constants/api.type';
import { matchingService } from '@/modules/posting/services/matching.service';
import { ConfirmMatchCandidateDTO, CreateMatchRequestDTO } from '@/modules/posting/matching.schema';

class MatchingController {
  getLatestPendingResult = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const result = await matchingService.getLatestPendingResult(userId);

    const response: ApiResponse<{
      request_id: string | null;
      lost_post_id: string | null;
      total_candidates: number;
      matches: Array<{
        post: unknown;
        similarity_score: number;
      }>;
    }> = {
      success: true,
      message: 'Lấy kết quả matching chờ xác nhận thành công',
      data: {
        request_id: result?.requestId || null,
        lost_post_id: result?.lostPostId || null,
        total_candidates: result?.totalCandidates || 0,
        matches: result?.matches || [],
      },
    };

    res.status(200).json(response);
  });

  confirmCandidate = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { requestId } = req.params;
    const body = req.body as ConfirmMatchCandidateDTO;

    await matchingService.confirmCandidate({
      userId,
      requestId,
      foundPostId: body.found_post_id,
    });

    const response: ApiResponse<null> = {
      success: true,
      message: 'Đã xác nhận candidate thành công',
    };

    res.status(200).json(response);
  });

  getScanState = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const result = await matchingService.getScanState(userId);

    const response: ApiResponse<{
      is_scanning: boolean;
      request_id: string | null;
      lost_post_id: string | null;
      status: string | null;
    }> = {
      success: true,
      message: 'Lấy trạng thái AI tìm kiếm thành công',
      data: {
        is_scanning: result.isScanning,
        request_id: result.request?.id || null,
        lost_post_id: result.request?.lostPost?.id || null,
        status: result.request?.status || null,
      },
    };

    res.status(200).json(response);
  });

  createMatchRequest = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const body = req.body as CreateMatchRequestDTO;
    const request = await matchingService.createMatchRequest({
      lostPostId: body.lost_post_id,
      userId,
    });

    const response: ApiResponse<{
      request_id: string;
      lost_post_id: string;
      user_id: string;
      status: string;
      created_at: string;
      message: string;
    }> = {
      success: true,
      message: 'Đã tạo match request và gửi AI matching service',
      data: {
        request_id: request.id,
        lost_post_id: request.lostPost.id,
        user_id: request.user.idUser,
        status: request.status,
        created_at: request.createdAt.toISOString(),
        message: 'Scan history đã được khởi chạy',
      },
    };

    res.status(201).json(response);
  });
}

export const matchingController = new MatchingController();
