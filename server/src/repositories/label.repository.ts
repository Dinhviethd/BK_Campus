import { Repository } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { Label } from '@/models/label.model';
import { Card } from '@/models/card.model';
import { BoardUser } from '@/models/board_user.model';
import { Role } from '@/models/role.model';

export class LabelRepository {
  private repository: Repository<Label>;
  private cardRepository: Repository<Card>;
  private boardUserRepository: Repository<BoardUser>;

  constructor() {
    this.repository = AppDataSource.getRepository(Label);
    this.cardRepository = AppDataSource.getRepository(Card);
    this.boardUserRepository = AppDataSource.getRepository(BoardUser);
  }

  // Lấy label theo ID
  async findById(idLabel: number): Promise<Label | null> {
    return this.repository.findOne({
      where: { idLabel },
      relations: ['board'],
    });
  }

  // Lấy tất cả labels trong board
  async findByBoardId(boardId: number): Promise<Label[]> {
    return this.repository.find({
      where: { board: { idBoard: boardId } },
      relations: ['board'],
      order: { name: 'ASC' },
    });
  }

  // Tạo label mới
  async create(labelData: Partial<Label>): Promise<Label> {
    const label = this.repository.create(labelData);
    return this.repository.save(label);
  }

  // Cập nhật label
  async update(idLabel: number, updateData: Partial<Label>): Promise<Label | null> {
    await this.repository.update(idLabel, updateData);
    return this.findById(idLabel);
  }

  // Xóa label
  async delete(idLabel: number): Promise<boolean> {
    const result = await this.repository.delete(idLabel);
    return result.affected !== 0;
  }

  // Thêm label vào card
  async addLabelToCard(cardId: number, labelId: number): Promise<Card | null> {
    const card = await this.cardRepository.findOne({
      where: { idCard: cardId },
      relations: ['labels', 'list', 'list.board', 'createdBy'],
    });
    
    if (!card) return null;

    const label = await this.findById(labelId);
    if (!label) return null;

    // Kiểm tra label thuộc cùng board với card
    if (label.board.idBoard !== card.list.board.idBoard) {
      return null;
    }

    // Kiểm tra label đã được thêm chưa
    if (!card.labels) {
      card.labels = [];
    }
    
    if (!card.labels.some(l => l.idLabel === labelId)) {
      card.labels.push(label);
      await this.cardRepository.save(card);
    }

    return card;
  }

  // Xóa label khỏi card
  async removeLabelFromCard(cardId: number, labelId: number): Promise<Card | null> {
    const card = await this.cardRepository.findOne({
      where: { idCard: cardId },
      relations: ['labels', 'list', 'list.board', 'createdBy'],
    });
    
    if (!card) return null;

    if (card.labels) {
      card.labels = card.labels.filter(l => l.idLabel !== labelId);
      await this.cardRepository.save(card);
    }

    return card;
  }

  // Kiểm tra user có trong board không
  async isUserInBoard(userId: number, boardId: number): Promise<boolean> {
    const count = await this.boardUserRepository.count({
      where: { user: { idUser: userId }, board: { idBoard: boardId } },
    });
    return count > 0;
  }

  // Lấy role của user trong board
  async getUserBoardRole(userId: number, boardId: number): Promise<Role | null> {
    const boardUser = await this.boardUserRepository.findOne({
      where: { user: { idUser: userId }, board: { idBoard: boardId } },
      relations: ['role', 'role.permissions'],
    });
    return boardUser?.role || null;
  }

  // Kiểm tra user có permission không
  async userHasPermission(userId: number, boardId: number, permissionCode: string): Promise<boolean> {
    const role = await this.getUserBoardRole(userId, boardId);
    if (!role || !role.permissions) return false;
    return role.permissions.some(p => p.code === permissionCode);
  }
}

export const labelRepository = new LabelRepository();
