import { CardRepository, cardRepository } from '@/repositories/card.repository';
import { CreateCardInput, UpdateCardInput, MoveCardInput } from '@/schemas/card.schema';
import { CardDTO } from '@/DTOs/card.dto';
import { AppError } from '@/utils/error.response';
import { Card } from '@/models/card.model';

const PERMISSIONS = {
  CARD_CREATE: 'card:create',
  CARD_VIEW: 'card:view',
  CARD_EDIT: 'card:edit',
  CARD_DELETE: 'card:delete',
  CARD_MOVE: 'card:move',
};

export class CardService {
  private cardRepo: CardRepository;

  constructor() {
    this.cardRepo = cardRepository;
  }

  // Lấy chi tiết card
  async getCardById(cardId: number, userId: number): Promise<CardDTO> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new AppError(404, 'Card không tồn tại');
    }

    const boardId = card.list.board.idBoard;
    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_VIEW);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền xem card này');
    }

    return this.toCardDTO(card);
  }

  // Lấy danh sách cards trong list
  async getCardsByListId(listId: number, userId: number): Promise<CardDTO[]> {
    const list = await this.cardRepo.getListById(listId);
    if (!list) {
      throw new AppError(404, 'List không tồn tại');
    }

    const boardId = list.board.idBoard;
    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_VIEW);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền xem cards trong list này');
    }

    const cards = await this.cardRepo.findByListId(listId);
    return cards.map(this.toCardDTO);
  }

  // Lấy danh sách cards trong board
  async getCardsByBoardId(boardId: number, userId: number): Promise<CardDTO[]> {
    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_VIEW);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền xem cards trong board này');
    }

    const cards = await this.cardRepo.findByBoardId(boardId);
    return cards.map(this.toCardDTO);
  }

  // Tạo card mới
  async createCard(userId: number, input: CreateCardInput): Promise<CardDTO> {
    // Kiểm tra list tồn tại
    const list = await this.cardRepo.getListById(input.idList);
    if (!list || list.deleteAt) {
      throw new AppError(404, 'List không tồn tại');
    }

    const boardId = list.board.idBoard;

    // Kiểm tra quyền tạo card
    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_CREATE);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền tạo card trong board này');
    }

    // Lấy position tiếp theo nếu không được chỉ định
    const position = input.position ?? await this.cardRepo.getNextPosition(input.idList);

    // Tạo card
    const card = await this.cardRepo.create({
      cardName: input.cardName,
      description: input.description,
      dueDate: input.dueDate,
      position,
      list: { idList: input.idList } as any,
      createdBy: { idUser: userId } as any,
    });

    // Lấy lại card với relations
    const createdCard = await this.cardRepo.findById(card.idCard);
    if (!createdCard) {
      throw new AppError(500, 'Không thể tạo card');
    }

    return this.toCardDTO(createdCard);
  }

  // Cập nhật card
  async updateCard(cardId: number, userId: number, input: UpdateCardInput): Promise<CardDTO> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new AppError(404, 'Card không tồn tại');
    }

    const boardId = card.list.board.idBoard;

    // Kiểm tra quyền chỉnh sửa
    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_EDIT);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền chỉnh sửa card này');
    }

    // Handle null dueDate - convert to undefined for TypeORM
    const updateData = {
      ...input,
      dueDate: input.dueDate === null ? undefined : input.dueDate,
    };

    const updatedCard = await this.cardRepo.update(cardId, updateData);
    if (!updatedCard) {
      throw new AppError(500, 'Không thể cập nhật card');
    }

    return this.toCardDTO(updatedCard);
  }

  // Di chuyển card
  async moveCard(cardId: number, userId: number, input: MoveCardInput): Promise<CardDTO> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new AppError(404, 'Card không tồn tại');
    }

    // Kiểm tra list đích tồn tại
    const targetList = await this.cardRepo.getListById(input.idList);
    if (!targetList || targetList.deleteAt) {
      throw new AppError(404, 'List đích không tồn tại');
    }

    const sourceBoardId = card.list.board.idBoard;
    const targetBoardId = targetList.board.idBoard;

    // Kiểm tra quyền di chuyển trong board nguồn
    const hasSourcePermission = await this.cardRepo.userHasPermission(userId, sourceBoardId, PERMISSIONS.CARD_MOVE);
    if (!hasSourcePermission) {
      throw new AppError(403, 'Bạn không có quyền di chuyển card này');
    }

    // Nếu di chuyển sang board khác, kiểm tra quyền tạo card trong board đích
    if (sourceBoardId !== targetBoardId) {
      const hasTargetPermission = await this.cardRepo.userHasPermission(userId, targetBoardId, PERMISSIONS.CARD_CREATE);
      if (!hasTargetPermission) {
        throw new AppError(403, 'Bạn không có quyền tạo card trong board đích');
      }
    }

    const movedCard = await this.cardRepo.moveCard(cardId, input.idList, input.position);
    if (!movedCard) {
      throw new AppError(500, 'Không thể di chuyển card');
    }

    return this.toCardDTO(movedCard);
  }

  // Xóa card
  async deleteCard(cardId: number, userId: number): Promise<boolean> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new AppError(404, 'Card không tồn tại');
    }

    const boardId = card.list.board.idBoard;

    // Kiểm tra quyền xóa
    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_DELETE);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền xóa card này');
    }

    return this.cardRepo.delete(cardId);
  }

  // Archive card
  async archiveCard(cardId: number, userId: number): Promise<boolean> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new AppError(404, 'Card không tồn tại');
    }

    const boardId = card.list.board.idBoard;

    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_EDIT);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền archive card này');
    }

    return this.cardRepo.archive(cardId);
  }

  // Unarchive card
  async unarchiveCard(cardId: number, userId: number): Promise<boolean> {
    const card = await this.cardRepo.findById(cardId);
    if (!card) {
      throw new AppError(404, 'Card không tồn tại');
    }

    const boardId = card.list.board.idBoard;

    const hasPermission = await this.cardRepo.userHasPermission(userId, boardId, PERMISSIONS.CARD_EDIT);
    if (!hasPermission) {
      throw new AppError(403, 'Bạn không có quyền unarchive card này');
    }

    return this.cardRepo.unarchive(cardId);
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

export const cardService = new CardService();
