import { Request, Response } from 'express';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponse } from '@/constants/api.type';
import { postService } from '@/modules/posting/services/post.service';
import { AiAnalyzeCallbackDTO, AiEmbeddingCallbackDTO } from '@/modules/posting/webhook.schema';

class WebhookController {
	/**
	 * POST /api/webhook/ai/analyze-callback
	 * Nhận callback từ AI service sau khi xử lý background job.
	 */
	aiAnalyzeCallback = asyncHandler(async (req: Request, res: Response) => {
		this.verifyWebhookSecret(req);

		const callbackBody = req.body as AiAnalyzeCallbackDTO;
		const result = await postService.handleAiCallback(callbackBody);

		const response: ApiResponse<{
			post_id: string;
			retried: boolean;
			forwarded_embedding: boolean;
			status: string;
			type: string | null;
		}> = {
			success: true,
			message: result.retried
				? 'AI callback FAILED: đã gửi lại request để AI xử lý lại'
				: result.forwardedEmbedding
					? 'AI analyze callback SUCCESS: đã gửi tiếp embedding request'
					: 'AI analyze callback SUCCESS: đã cập nhật trạng thái bài viết',
			data: {
				post_id: callbackBody.post_id,
				retried: result.retried,
				forwarded_embedding: result.forwardedEmbedding,
				status: result.post?.status || 'UNKNOWN',
				type: result.post?.type || null,
			},
		};

		res.status(200).json(response);
	});

	/**
	 * POST /api/webhook/ai/embedding-callback
	 * Nhận callback từ AI embedding service sau khi xử lý background job.
	 */
	aiEmbeddingCallback = asyncHandler(async (req: Request, res: Response) => {
		this.verifyWebhookSecret(req);

		const callbackBody = req.body as AiEmbeddingCallbackDTO;
		const result = await postService.handleEmbeddingCallback(callbackBody);

		const response: ApiResponse<{
			post_id: string;
			retried: boolean;
			status: string;
		}> = {
			success: true,
			message: result.retried
				? 'AI embedding callback FAILED: đã gửi lại embedding request'
				: 'AI embedding callback SUCCESS: đã cập nhật dữ liệu embedding',
			data: {
				post_id: callbackBody.post_id,
				retried: result.retried,
				status: result.post?.status || 'UNKNOWN',
			},
		};

		res.status(200).json(response);
	});

	private verifyWebhookSecret(req: Request): void {
		const expectedSecret = process.env.WEBHOOK_SECRET;
		if (!expectedSecret) {
			return;
		}

		const secret = req.headers['x-webhook-secret'];
		if (secret !== expectedSecret) {
			throw new AppError(401, 'Webhook secret không hợp lệ');
		}
	}
}

export const webhookController = new WebhookController();
