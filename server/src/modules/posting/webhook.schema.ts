import { z } from 'zod';
import { post_type, process_status } from '@/constants/constants';

export const aiAnalyzeRequestSchema = z.object({
	post_id: z.string().uuid('post_id không hợp lệ'),
	post_images_id: z.string().uuid('post_images_id không hợp lệ').optional().nullable(),
	content: z.string().min(1, 'content không được để trống'),
	type: z.enum(post_type, 'type phải là LOST hoặc FOUND'),
	image_urls: z.array(z.string().url('image_urls chứa URL không hợp lệ')),
	callback_url: z.string().url('callback_url không hợp lệ'),
});

export const aiAnalyzeResponseSchema = z.object({
	message: z.string(),
	post_id: z.string().uuid('post_id không hợp lệ'),
	post_images_id: z.string().uuid('post_images_id không hợp lệ').optional().nullable(),
});

export const aiEmbeddingRequestSchema = z.object({
	post_id: z.string().uuid('post_id không hợp lệ'),
	post_images_id: z.string().uuid('post_images_id không hợp lệ').optional().nullable(),
	content: z.string().min(1, 'content không được để trống'),
	image_urls: z.array(z.string().url('image_urls chứa URL không hợp lệ')),
	callback_url: z.string().url('callback_url không hợp lệ'),
});

export const aiEmbeddingResponseSchema = z.object({
	message: z.string(),
	post_id: z.string().uuid('post_id không hợp lệ'),
	post_images_id: z.string().uuid('post_images_id không hợp lệ').optional().nullable(),
});

export const aiAnalyzeCallbackSchema = z
	.object({
		post_id: z.string().uuid('post_id không hợp lệ'),
		process_status: z.enum(['SUCCESS', 'FAILED']),
		status: z.enum([process_status.embedding, process_status.rejected]).optional(),
		type: z.enum(post_type).optional(),
		message: z.string().optional(),
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

export const aiEmbeddingCallbackSchema = z
	.object({
		post_id: z.string().uuid('post_id không hợp lệ'),
		process_status: z.enum(['SUCCESS', 'FAILED']),
		status: z.enum([process_status.active, process_status.embedding]).optional(),
		extracted_info: z.record(z.string(), z.unknown()).optional(),
		item_type_embedding: z.array(z.number()).optional(),
		image_feature: z
			.object({
				post_images_id: z.string().uuid('post_images_id không hợp lệ').optional().nullable(),
				image_urls: z.array(z.string().url('image_urls chứa URL không hợp lệ')),
				extracted_features: z.record(z.string(), z.unknown()).optional(),
			})
			.optional(),
		message: z.string().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.process_status === 'SUCCESS') {
			if (!data.status) {
				ctx.addIssue({
					code: 'custom',
					path: ['status'],
					message: 'status là bắt buộc khi process_status = SUCCESS',
				});
			}
		}
	});

export type AiAnalyzeRequestDTO = z.infer<typeof aiAnalyzeRequestSchema>;
export type AiAnalyzeResponseDTO = z.infer<typeof aiAnalyzeResponseSchema>;
export type AiAnalyzeCallbackDTO = z.infer<typeof aiAnalyzeCallbackSchema>;
export type AiEmbeddingRequestDTO = z.infer<typeof aiEmbeddingRequestSchema>;
export type AiEmbeddingResponseDTO = z.infer<typeof aiEmbeddingResponseSchema>;
export type AiEmbeddingCallbackDTO = z.infer<typeof aiEmbeddingCallbackSchema>;

