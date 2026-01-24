import { LabelRepository, labelRepository } from '@/repositories/label.repository';
import { CardRepository, cardRepository } from '@/repositories/card.repository';
import { CreateLabelInput, UpdateLabelInput } from '@/schemas/label.schema';
import { LabelDTO } from '@/DTOs/label.dto';
import { CardDTO } from '@/DTOs/card.dto';
import { AppError } from '@/utils/error.response';
import { Label } from '@/models/label.model';
import { Card } from '@/models/card.model';

const PERMISSIONS = {
  CARD_EDIT: 'card:edit',
  BOARD_EDIT: 'board:edit',
};

export class LabelService {
  private labelRepo: LabelRepository;
  private cardRepo: CardRepository;

  constructor() {
    this.labelRepo = labelRepository;
    this.cardRepo = cardRepository;
  }

  // Lấy danh sách labels trong board
  async getLabelsByBoardId(boardId: number, userId: number): Promise<LabelDTO[]> {
    // Kiểm tra user có trong board không
    const isInBoard = await this.labelRepo.isUserInBoard(userId, boardId);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền truy cập board này');
    }

    const labels = await this.labelRepo.findByBoardId(boardId);
    return labels.map(this.toLabelDTO);
  }

  // Tạo label mới
  async createLabel(userId: number, input: CreateLabelInput): Promise<LabelDTO> {
    // Kiểm tra user có trong board không
    const isInBoard = await this.labelRepo.isUserInBoard(userId, input.idBoard);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền tạo label trong board này');
    }

    // Tạo label
    const label = await this.labelRepo.create({
      name: input.name,
      color: input.color,
      board: { idBoard: input.idBoard } as any,
    });

    const createdLabel = await this.labelRepo.findById(label.idLabel);
    if (!createdLabel) {
      throw new AppError(500, 'Không thể tạo label');
    }

    return this.toLabelDTO(createdLabel);
  }

  // Cập nhật label
  async updateLabel(labelId: number, userId: number, input: UpdateLabelInput): Promise<LabelDTO> {
    const label = await this.labelRepo.findById(labelId);
    if (!label) {
      throw new AppError(404, 'Label không tồn tại');
    }

    // Kiểm tra quyền
    const isInBoard = await this.labelRepo.isUserInBoard(userId, label.board.idBoard);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền cập nhật label này');
    }

    const updatedLabel = await this.labelRepo.update(labelId, input);
    if (!updatedLabel) {
      throw new AppError(500, 'Không thể cập nhật label');
    }

    return this.toLabelDTO(updatedLabel);
  }

  // Xóa label
  async deleteLabel(labelId: number, userId: number): Promise<boolean> {
    const label = await this.labelRepo.findById(labelId);
    if (!label) {
      throw new AppError(404, 'Label không tồn tại');
    }

    const isInBoard = await this.labelRepo.isUserInBoard(userId, label.board.idBoard);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền xóa label này');
    }

    return this.labelRepo.delete(labelId);
  }

  // Thêm label vào card
  async addLabelToCard(cardId: number, labelId: number, userId: number): Promise<CardDTO> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new AppError(404, 'Card không tồn tại');
    }

    const boardId = card.list.board.idBoard;

    // Kiểm tra quyền chỉnh sửa card
    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_EDIT);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền chỉnh sửa card này');
    }

    const updatedCard = await this.labelRepo.addLabelToCard(cardId, labelId);
    if (!updatedCard) {
      throw new AppError(400, 'Không thể thêm label vào card');
    }

    return this.toCardDTO(updatedCard);
  }

  // Xóa label khỏi card
  async removeLabelFromCard(cardId: number, labelId: number, userId: number): Promise<CardDTO> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new AppError(404, 'Card không tồn tại');
    }

    const boardId = card.list.board.idBoard;

    // Kiểm tra quyền chỉnh sửa card
    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_EDIT);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền chỉnh sửa card này');
    }

    const updatedCard = await this.labelRepo.removeLabelFromCard(cardId, labelId);
    if (!updatedCard) {
      throw new AppError(400, 'Không thể xóa label khỏi card');
    }

    return this.toCardDTO(updatedCard);
  }

  private toLabelDTO(label: Label): LabelDTO {
    return {
      idLabel: label.idLabel,
      name: label.name,
      color: label.color,
      board: {
        idBoard: label.board.idBoard,
        boardName: label.board.boardName,
      },
    };
  }

  private toCardDTO(card: Card): CardDTO {
    return {
      idCard: card.idCard,
      cardName: card.cardName,
      description: card.description,
      dueDate: card.dueDate,
      position: card.position,
      isArchived: card.isArchived,
      attachmentUrl: card.attachmentUrl,
      createdAt: card.createdAt,
      list: {
        idList: card.list.idList,
        listName: card.list.listName,
      },
      createdBy: {
        idUser: card.createdBy.idUser,
        name: card.createdBy.name,
      },
      labels: card.labels?.map(label => ({
        idLabel: label.idLabel,
        name: label.name,
        color: label.color,
      })),
    };
  }
}

export const labelService = new LabelService();
