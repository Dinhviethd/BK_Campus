import { Request, Response } from 'express';
import { cardService } from '@/services/card.service';
import { createCardSchema, updateCardSchema, moveCardSchema } from '@/schemas/card.schema';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponseDTO } from '@/DTOs/auth.dto';
import { CardDTO } from '@/DTOs/card.dto';

class CardController {
  // Lấy chi tiết card
  getCardById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const cardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(cardId)) {
      throw new AppError(400, 'ID card không hợp lệ');
    }

    const card = await cardService.getCardById(cardId, userId);

    const response: ApiResponseDTO<CardDTO> = {
      success: true,
      message: 'Lấy thông tin card thành công',
      data: card,
    };

    res.status(200).json(response);
  });

  // Lấy danh sách cards trong list
  getCardsByList = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const listId = parseInt(req.params.listId);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(listId)) {
      throw new AppError(400, 'ID list không hợp lệ');
    }

    const cards = await cardService.getCardsByListId(listId, userId);

    const response: ApiResponseDTO<CardDTO[]> = {
      success: true,
      message: 'Lấy danh sách cards thành công',
      data: cards,
    };

    res.status(200).json(response);
  });

  // Lấy danh sách cards trong board
  getCardsByBoard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const boardId = parseInt(req.params.boardId);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(boardId)) {
      throw new AppError(400, 'ID board không hợp lệ');
    }

    const cards = await cardService.getCardsByBoardId(boardId, userId);

    const response: ApiResponseDTO<CardDTO[]> = {
      success: true,
      message: 'Lấy danh sách cards thành công',
      data: cards,
    };

    res.status(200).json(response);
  });

  // Tạo card mới
  createCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const validationResult = createCardSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const card = await cardService.createCard(userId, validationResult.data);

    const response: ApiResponseDTO<CardDTO> = {
      success: true,
      message: 'Tạo card thành công',
      data: card,
    };

    res.status(201).json(response);
  });

  // Cập nhật card
  updateCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const cardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(cardId)) {
      throw new AppError(400, 'ID card không hợp lệ');
    }

    const validationResult = updateCardSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const card = await cardService.updateCard(cardId, userId, validationResult.data);

    const response: ApiResponseDTO<CardDTO> = {
      success: true,
      message: 'Cập nhật card thành công',
      data: card,
    };

    res.status(200).json(response);
  });

  // Di chuyển card
  moveCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const cardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(cardId)) {
      throw new AppError(400, 'ID card không hợp lệ');
    }

    const validationResult = moveCardSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const card = await cardService.moveCard(cardId, userId, validationResult.data);

    const response: ApiResponseDTO<CardDTO> = {
      success: true,
      message: 'Di chuyển card thành công',
      data: card,
    };

    res.status(200).json(response);
  });

  // Xóa card
  deleteCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const cardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(cardId)) {
      throw new AppError(400, 'ID card không hợp lệ');
    }

    await cardService.deleteCard(cardId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Xóa card thành công',
      data: null,
    };

    res.status(200).json(response);
  });

  // Archive card
  archiveCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const cardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(cardId)) {
      throw new AppError(400, 'ID card không hợp lệ');
    }

    await cardService.archiveCard(cardId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Archive card thành công',
      data: null,
    };

    res.status(200).json(response);
  });

  // Unarchive card
  unarchiveCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const cardId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(cardId)) {
      throw new AppError(400, 'ID card không hợp lệ');
    }

    await cardService.unarchiveCard(cardId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Unarchive card thành công',
      data: null,
    };

    res.status(200).json(response);
  });
}

export const cardController = new CardController();
