import { z } from 'zod';

// Schema tạo card
export const createCardSchema = z.object({
  cardName: z
    .string()
    .min(1, 'Tên card không được để trống')
    .max(200, 'Tên card không được vượt quá 200 ký tự'),
  description: z.string().max(5000, 'Mô tả không được vượt quá 5000 ký tự').optional(),
  dueDate: z.coerce.date().optional(),
  idList: z.number().min(1, 'idList không hợp lệ'),
  position: z.number().min(0).optional(),
});

// Schema cập nhật card
export const updateCardSchema = z.object({
  cardName: z
    .string()
    .min(1, 'Tên card không được để trống')
    .max(200, 'Tên card không được vượt quá 200 ký tự')
    .optional(),
  description: z.string().max(5000, 'Mô tả không được vượt quá 5000 ký tự').optional(),
  dueDate: z.coerce.date().optional().nullable(),
  position: z.number().min(0).optional(),
  isArchived: z.boolean().optional(),
  attachmentUrl: z.string().optional(),
});

// Schema di chuyển card
export const moveCardSchema = z.object({
  idList: z.number().min(1, 'idList không hợp lệ'),
  position: z.number().min(0, 'Position không hợp lệ'),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type MoveCardInput = z.infer<typeof moveCardSchema>;
