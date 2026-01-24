import { Request, Response } from 'express';
import { boardService } from '@/services/board.service';
import { createBoardSchema, updateBoardSchema } from '@/schemas/board.schema';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponseDTO } from '@/DTOs/auth.dto';
import { BoardDTO } from '@/DTOs/board.dto';

class BoardController {
  // Lấy danh sách boards trong workspace
  getBoardsByWorkspace = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const workspaceId = parseInt(req.params.workspaceId);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(workspaceId)) {
      throw new AppError(400, 'ID workspace không hợp lệ');
    }

    const boards = await boardService.getBoardsByWorkspaceId(workspaceId, userId);

    const response: ApiResponseDTO<BoardDTO[]> = {
      success: true,
      message: 'Lấy danh sách boards thành công',
      data: boards,
    };

    res.status(200).json(response);
  });

  // Lấy chi tiết board
  getBoardById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const boardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(boardId)) {
      throw new AppError(400, 'ID board không hợp lệ');
    }

    const board = await boardService.getBoardById(boardId, userId);

    const response: ApiResponseDTO<BoardDTO> = {
      success: true,
      message: 'Lấy thông tin board thành công',
      data: board,
    };

    res.status(200).json(response);
  });

  // Tạo board mới
  createBoard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const validationResult = createBoardSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const board = await boardService.createBoard(userId, validationResult.data);

    const response: ApiResponseDTO<BoardDTO> = {
      success: true,
      message: 'Tạo board thành công',
      data: board,
    };

    res.status(201).json(response);
  });

  // Cập nhật board
  updateBoard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const boardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(boardId)) {
      throw new AppError(400, 'ID board không hợp lệ');
    }

    const validationResult = updateBoardSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const board = await boardService.updateBoard(boardId, userId, validationResult.data);

    const response: ApiResponseDTO<BoardDTO> = {
      success: true,
      message: 'Cập nhật board thành công',
      data: board,
    };

    res.status(200).json(response);
  });

  // Xóa board
  deleteBoard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const boardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(boardId)) {
      throw new AppError(400, 'ID board không hợp lệ');
    }

    await boardService.deleteBoard(boardId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Xóa board thành công',
      data: null,
    };

    res.status(200).json(response);
  });
}

export const boardController = new BoardController();
