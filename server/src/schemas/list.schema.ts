import { z } from 'zod';

// Schema tạo list
export const createListSchema = z.object({
  listName: z
    .string()
    .min(1, 'Tên list không được để trống')
    .max(100, 'Tên list không được vượt quá 100 ký tự'),
  idBoard: z.number().min(1, 'idBoard không hợp lệ'),
  position: z.number().min(0).optional(),
});

// Schema cập nhật list
export const updateListSchema = z.object({
  listName: z
    .string()
    .min(1, 'Tên list không được để trống')
    .max(100, 'Tên list không được vượt quá 100 ký tự')
    .optional(),
  position: z.number().min(0).optional(),
});

export type CreateListInput = z.infer<typeof createListSchema>;
export type UpdateListInput = z.infer<typeof updateListSchema>;
