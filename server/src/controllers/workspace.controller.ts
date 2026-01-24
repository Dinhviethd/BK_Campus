import { Request, Response } from 'express';
import { workspaceService } from '@/services/workspace.service';
import { createWorkspaceSchema, updateWorkspaceSchema } from '@/schemas/workspace.schema';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponseDTO } from '@/DTOs/auth.dto';
import { WorkspaceDTO } from '@/DTOs/workspace.dto';

class WorkspaceController {
  // Lấy danh sách workspace của user hiện tại
  getMyWorkspaces = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const workspaces = await workspaceService.getWorkspacesByUserId(userId);

    const response: ApiResponseDTO<WorkspaceDTO[]> = {
      success: true,
      message: 'Lấy danh sách workspace thành công',
      data: workspaces,
    };

    res.status(200).json(response);
  });

  // Lấy chi tiết workspace
  getWorkspaceById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const workspaceId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(workspaceId)) {
      throw new AppError(400, 'ID workspace không hợp lệ');
    }

    const workspace = await workspaceService.getWorkspaceById(workspaceId, userId);

    const response: ApiResponseDTO<WorkspaceDTO> = {
      success: true,
      message: 'Lấy thông tin workspace thành công',
      data: workspace,
    };

    res.status(200).json(response);
  });

  // Tạo workspace mới
  createWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const validationResult = createWorkspaceSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const workspace = await workspaceService.createWorkspace(userId, validationResult.data);

    const response: ApiResponseDTO<WorkspaceDTO> = {
      success: true,
      message: 'Tạo workspace thành công',
      data: workspace,
    };

    res.status(201).json(response);
  });

  // Cập nhật workspace
  updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const workspaceId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(workspaceId)) {
      throw new AppError(400, 'ID workspace không hợp lệ');
    }

    const validationResult = updateWorkspaceSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const workspace = await workspaceService.updateWorkspace(workspaceId, userId, validationResult.data);

    const response: ApiResponseDTO<WorkspaceDTO> = {
      success: true,
      message: 'Cập nhật workspace thành công',
      data: workspace,
    };

    res.status(200).json(response);
  });

  // Xóa workspace
  deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const workspaceId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(workspaceId)) {
      throw new AppError(400, 'ID workspace không hợp lệ');
    }

    await workspaceService.deleteWorkspace(workspaceId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Xóa workspace thành công',
    };

    res.status(200).json(response);
  });
}

export const workspaceController = new WorkspaceController();
