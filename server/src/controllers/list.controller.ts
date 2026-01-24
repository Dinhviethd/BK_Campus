import { Request, Response } from 'express';
import { listService } from '@/services/list.service';
import { createListSchema, updateListSchema } from '@/schemas/list.schema';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponseDTO } from '@/DTOs/auth.dto';
import { ListDTO } from '@/DTOs/list.dto';

class ListController {
  // Lấy danh sách lists trong board
  getListsByBoard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const boardId = parseInt(req.params.boardId);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(boardId)) {
      throw new AppError(400, 'ID board không hợp lệ');
    }

    const lists = await listService.getListsByBoardId(boardId, userId);

    const response: ApiResponseDTO<ListDTO[]> = {
      success: true,
      message: 'Lấy danh sách lists thành công',
      data: lists,
    };

    res.status(200).json(response);
  });

  // Tạo list mới
  createList = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const validationResult = createListSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const list = await listService.createList(userId, validationResult.data);

    const response: ApiResponseDTO<ListDTO> = {
      success: true,
      message: 'Tạo list thành công',
      data: list,
    };

    res.status(201).json(response);
  });

  // Cập nhật list
  updateList = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const listId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(listId)) {
      throw new AppError(400, 'ID list không hợp lệ');
    }

    const validationResult = updateListSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const list = await listService.updateList(listId, userId, validationResult.data);

    const response: ApiResponseDTO<ListDTO> = {
      success: true,
      message: 'Cập nhật list thành công',
      data: list,
    };

    res.status(200).json(response);
  });

  // Xóa list
  deleteList = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const listId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(listId)) {
      throw new AppError(400, 'ID list không hợp lệ');
    }

    await listService.deleteList(listId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Xóa list thành công',
      data: null,
    };

    res.status(200).json(response);
  });

  // Archive list
  archiveList = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const listId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(listId)) {
      throw new AppError(400, 'ID list không hợp lệ');
    }

    await listService.archiveList(listId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Archive list thành công',
      data: null,
    };

    res.status(200).json(response);
  });
}

export const listController = new ListController();
