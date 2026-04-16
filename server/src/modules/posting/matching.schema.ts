import { z } from 'zod';

export const createMatchRequestSchema = z.object({
  lost_post_id: z.string().uuid('lost_post_id không hợp lệ'),
});

export const confirmMatchCandidateSchema = z.object({
  found_post_id: z.string().uuid('found_post_id không hợp lệ'),
});

export const aiMatchingRequestSchema = z.object({
  request_id: z.string().uuid('request_id không hợp lệ'),
  lost_post_id: z.string().uuid('lost_post_id không hợp lệ'),
  callback_url: z.string().url('callback_url không hợp lệ'),
});

export const aiMatchingResponseSchema = z.object({
  request_id: z.string().uuid('request_id không hợp lệ'),
  status: z.string().min(1, 'status không được để trống'),
});

export const aiMatchingCallbackSchema = z
  .object({
    request_id: z.string().uuid('request_id không hợp lệ'),
    lost_post_id: z.string().uuid('lost_post_id không hợp lệ'),
    status: z.enum(['SUCCESS', 'FAILED']),
    total_candidates: z.number().int().nonnegative().optional(),
    candidates: z
      .array(
        z.object({
          found_post_id: z.string().uuid('found_post_id không hợp lệ'),
          similarity_score: z.number(),
        })
      )
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'SUCCESS') {
      if (data.total_candidates === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['total_candidates'],
          message: 'total_candidates là bắt buộc khi status = SUCCESS',
        });
      }

      if (!data.candidates) {
        ctx.addIssue({
          code: 'custom',
          path: ['candidates'],
          message: 'candidates là bắt buộc khi status = SUCCESS',
        });
      }
    }
  });

export type CreateMatchRequestDTO = z.infer<typeof createMatchRequestSchema>;
export type ConfirmMatchCandidateDTO = z.infer<typeof confirmMatchCandidateSchema>;
export type AiMatchingRequestDTO = z.infer<typeof aiMatchingRequestSchema>;
export type AiMatchingResponseDTO = z.infer<typeof aiMatchingResponseSchema>;
export type AiMatchingCallbackDTO = z.infer<typeof aiMatchingCallbackSchema>;
