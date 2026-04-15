"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookController = void 0;
const error_response_1 = require("../../../utils/error.response");
const post_service_1 = require("../../../modules/posting/services/post.service");
class WebhookController {
    /**
     * POST /api/webhook/ai/analyze-callback
     * Nhận callback từ AI service sau khi xử lý background job.
     */
    aiAnalyzeCallback = (0, error_response_1.asyncHandler)(async (req, res) => {
        this.verifyWebhookSecret(req);
        const callbackBody = req.body;
        const result = await post_service_1.postService.handleAiCallback(callbackBody);
        const response = {
            success: true,
            message: result.retried
                ? 'AI callback FAILED: đã gửi lại request để AI xử lý lại'
                : 'AI callback SUCCESS: đã cập nhật trạng thái bài viết',
            data: {
                post_id: callbackBody.post_id,
                retried: result.retried,
                status: result.post?.status || 'UNKNOWN',
                type: result.post?.type || null,
            },
        };
        res.status(200).json(response);
    });
    verifyWebhookSecret(req) {
        const expectedSecret = process.env.WEBHOOK_SECRET;
        if (!expectedSecret) {
            return;
        }
        const secret = req.headers['x-webhook-secret'];
        if (secret !== expectedSecret) {
            throw new error_response_1.AppError(401, 'Webhook secret không hợp lệ');
        }
    }
}
exports.webhookController = new WebhookController();
