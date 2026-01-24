import { z } from 'zod';
import { TypeVisibility } from '@/constants/constants';

// Schema tạo board
export const createBoardSchema = z.object({
  boardName: z
    .string()
    .min(1, 'Tên board không được để trống')
    .max(100, 'Tên board không được vượt quá 100 ký tự'),
  visibility: z.nativeEnum(TypeVisibility).optional().default(TypeVisibility.WORKSPACE),
  backgroundUrl: z.string().optional(),
  idWorkspace: z.number().min(1, 'idWorkspace không hợp lệ'),
});

// Schema cập nhật board
export const updateBoardSchema = z.object({
  boardName: z
    .string()
    .min(1, 'Tên board không được để trống')
    .max(100, 'Tên board không được vượt quá 100 ký tự')
    .optional(),
  visibility: z.nativeEnum(TypeVisibility).optional(),
  backgroundUrl: z.string().optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
export type UpdateBoardInput = z.infer<typeof updateBoardSchema>;
