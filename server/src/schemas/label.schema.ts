import { z } from 'zod';

// Schema tạo label
export const createLabelSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên label không được để trống')
    .max(50, 'Tên label không được vượt quá 50 ký tự'),
  color: z.string().min(1, 'Màu không được để trống'),
  idBoard: z.number().min(1, 'idBoard không hợp lệ'),
});

// Schema cập nhật label
export const updateLabelSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên label không được để trống')
    .max(50, 'Tên label không được vượt quá 50 ký tự')
    .optional(),
  color: z.string().optional(),
});

// Schema thêm/xóa label khỏi card
export const cardLabelSchema = z.object({
  idLabel: z.number().min(1, 'idLabel không hợp lệ'),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type CardLabelInput = z.infer<typeof cardLabelSchema>;
