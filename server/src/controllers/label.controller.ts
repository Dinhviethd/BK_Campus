import { Request, Response } from 'express';
import { labelService } from '@/services/label.service';
import { createLabelSchema, updateLabelSchema, cardLabelSchema } from '@/schemas/label.schema';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponseDTO } from '@/DTOs/auth.dto';
import { LabelDTO } from '@/DTOs/label.dto';
import { CardDTO } from '@/DTOs/card.dto';

class LabelController {
  // Lấy danh sách labels trong board
  getLabelsByBoard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const boardId = parseInt(req.params.boardId);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(boardId)) {
      throw new AppError(400, 'ID board không hợp lệ');
    }

    const labels = await labelService.getLabelsByBoardId(boardId, userId);

    const response: ApiResponseDTO<LabelDTO[]> = {
      success: true,
      message: 'Lấy danh sách labels thành công',
      data: labels,
    };

    res.status(200).json(response);
  });

  // Tạo label mới
  createLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    const validationResult = createLabelSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const label = await labelService.createLabel(userId, validationResult.data);

    const response: ApiResponseDTO<LabelDTO> = {
      success: true,
      message: 'Tạo label thành công',
      data: label,
    };

    res.status(201).json(response);
  });

  // Cập nhật label
  updateLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const labelId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(labelId)) {
      throw new AppError(400, 'ID label không hợp lệ');
    }

    const validationResult = updateLabelSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const label = await labelService.updateLabel(labelId, userId, validationResult.data);

    const response: ApiResponseDTO<LabelDTO> = {
      success: true,
      message: 'Cập nhật label thành công',
      data: label,
    };

    res.status(200).json(response);
  });

  // Xóa label
  deleteLabel = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const labelId = parseInt(req.params.id);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(labelId)) {
      throw new AppError(400, 'ID label không hợp lệ');
    }

    await labelService.deleteLabel(labelId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Xóa label thành công',
      data: null,
    };

    res.status(200).json(response);
  });

  // Thêm label vào card
  addLabelToCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const cardId = parseInt(req.params.cardId);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(cardId)) {
      throw new AppError(400, 'ID card không hợp lệ');
    }

    const validationResult = cardLabelSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const card = await labelService.addLabelToCard(cardId, validationResult.data.idLabel, userId);

    const response: ApiResponseDTO<CardDTO> = {
      success: true,
      message: 'Thêm label vào card thành công',
      data: card,
    };

    res.status(200).json(response);
  });

  // Xóa label khỏi card
  removeLabelFromCard = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const cardId = parseInt(req.params.cardId);
    const labelId = parseInt(req.params.labelId);

    if (!userId) {
      throw new AppError(401, 'Unauthorized');
    }

    if (isNaN(cardId) || isNaN(labelId)) {
      throw new AppError(400, 'ID không hợp lệ');
    }

    const card = await labelService.removeLabelFromCard(cardId, labelId, userId);

    const response: ApiResponseDTO<CardDTO> = {
      success: true,
      message: 'Xóa label khỏi card thành công',
      data: card,
    };

    res.status(200).json(response);
  });
}

export const labelController = new LabelController();
