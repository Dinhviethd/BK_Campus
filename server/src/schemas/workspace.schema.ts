import { z } from 'zod';
import { TierWorkspace, Visibility } from '@/constants/constants';

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên workspace không được để trống')
    .max(100, 'Tên workspace không được vượt quá 100 ký tự'),
  avatarUrl: z.string().url().optional(),
  tier: z.nativeEnum(TierWorkspace).optional().default(TierWorkspace.FREE),
  status: z.nativeEnum(Visibility).optional().default(Visibility.PRIVATE),
});

export const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Tên workspace không được để trống')
    .max(100, 'Tên workspace không được vượt quá 100 ký tự')
    .optional(),
  avatarUrl: z.string().url().optional(),
  tier: z.nativeEnum(TierWorkspace).optional(),
  status: z.nativeEnum(Visibility).optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
