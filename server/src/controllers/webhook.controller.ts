import { Request, Response } from 'express';
import { asyncHandler, AppError } from '@/utils/error.response';
import { postCacheService } from '@/services/postCache.service';
import { ApiResponseDTO } from '@/DTOs/auth.dto';

class WebhookController {
  /**
   * POST /api/webhook/crawl-complete
   *
   * Được gọi bởi Supabase Database Trigger sau khi bot chạy xong.
   * Server chạy refresh() để fetch bài mới từ DB vào cache.
   *
   * Header: x-webhook-secret: <WEBHOOK_SECRET>
   */
  crawlComplete = asyncHandler(async (req: Request, res: Response) => {
    // Xác thực webhook secret
    const secret = req.headers['x-webhook-secret'] as string;
    const expectedSecret = process.env.WEBHOOK_SECRET;

    if (!expectedSecret) {
      throw new AppError(500, 'WEBHOOK_SECRET chưa được cấu hình trên server');
    }

    if (!secret || secret !== expectedSecret) {
      throw new AppError(401, 'Webhook secret không hợp lệ');
    }

    // Refresh cache — fetch bài mới từ DB
    const result = await postCacheService.refresh();

    const response: ApiResponseDTO<{ newCount: number; stats: ReturnType<typeof postCacheService.getStats> }> = {
      success: true,
      message: `Cache đã cập nhật — ${result.newCount} bài mới`,
      data: {
        newCount: result.newCount,
        stats: postCacheService.getStats(),
      },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/webhook/cache-stats
   * Health check — xem thông tin cache hiện tại (debug).
   */
  cacheStats = asyncHandler(async (_req: Request, res: Response) => {
    const stats = postCacheService.getStats();

    const response: ApiResponseDTO<typeof stats> = {
      success: true,
      message: 'Cache stats',
      data: stats,
    };

    res.status(200).json(response);
  });
}

export const webhookController = new WebhookController();
