"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiAnalyzeCallbackSchema = exports.aiAnalyzeResponseSchema = exports.aiAnalyzeRequestSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../../constants/constants");
exports.aiAnalyzeRequestSchema = zod_1.z.object({
    post_id: zod_1.z.string().uuid('post_id không hợp lệ'),
    content: zod_1.z.string().min(1, 'content không được để trống'),
    type: zod_1.z.enum(constants_1.post_type, 'type phải là LOST hoặc FOUND'),
    image_urls: zod_1.z.array(zod_1.z.string().url('image_urls chứa URL không hợp lệ')),
    callback_url: zod_1.z.string().url('callback_url không hợp lệ'),
});
exports.aiAnalyzeResponseSchema = zod_1.z.object({
    message: zod_1.z.string(),
    post_id: zod_1.z.string().uuid('post_id không hợp lệ'),
});
exports.aiAnalyzeCallbackSchema = zod_1.z
    .object({
    post_id: zod_1.z.string().uuid('post_id không hợp lệ'),
    process_status: zod_1.z.enum(['SUCCESS', 'FAILED']),
    status: zod_1.z.enum([constants_1.process_status.active, constants_1.process_status.rejected]).optional(),
    type: zod_1.z.enum(constants_1.post_type).optional(),
    message: zod_1.z.string().optional(),
})
    .superRefine((data, ctx) => {
    if (data.process_status === 'SUCCESS' && !data.status) {
        ctx.addIssue({
            code: 'custom',
            path: ['status'],
            message: 'status là bắt buộc khi process_status = SUCCESS',
        });
    }
});
