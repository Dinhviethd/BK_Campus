import { Repository } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { List } from '@/models/list.model';
import { Board } from '@/models/board.model';

export class ListRepository {
  private repository: Repository<List>;
  private boardRepository: Repository<Board>;

  constructor() {
    this.repository = AppDataSource.getRepository(List);
    this.boardRepository = AppDataSource.getRepository(Board);
  }

  // Lấy list theo ID
  async findById(idList: number): Promise<List | null> {
    return this.repository.findOne({
      where: { idList },
      relations: ['board'],
    });
  }

  // Lấy tất cả lists trong board
  async findByBoardId(boardId: number): Promise<List[]> {
    return this.repository.find({
      where: { 
        board: { idBoard: boardId },
        deleteAt: undefined,
      },
      relations: ['board'],
      order: { position: 'ASC' },
    });
  }

  // Lấy position tiếp theo trong board
  async getNextPosition(boardId: number): Promise<number> {
    const result = await this.repository
      .createQueryBuilder('list')
      .where('list.idBoard = :boardId', { boardId })
      .andWhere('list.deleteAt IS NULL')
      .select('MAX(list.position)', 'maxPosition')
      .getRawOne();
    
    return (result?.maxPosition ?? -1) + 1;
  }

  // Tạo list mới
  async create(listData: Partial<List>): Promise<List> {
    const list = this.repository.create(listData);
    return this.repository.save(list);
  }

  // Cập nhật list
  async update(idList: number, updateData: Partial<List>): Promise<List | null> {
    await this.repository.update(idList, updateData);
    return this.findById(idList);
  }

  // Xóa mềm list
  async softDelete(idList: number): Promise<boolean> {
    const result = await this.repository.update(idList, { deleteAt: new Date() });
    return result.affected !== 0;
  }

  // Archive list
  async archive(idList: number): Promise<boolean> {
    const result = await this.repository.update(idList, { archivedAt: new Date() });
    return result.affected !== 0;
  }

  // Unarchive list
  async unarchive(idList: number): Promise<boolean> {
    const result = await this.repository.update(idList, { archivedAt: undefined });
    return result.affected !== 0;
  }

  // Lấy board từ list
  async getBoardByListId(listId: number): Promise<Board | null> {
    const list = await this.findById(listId);
    return list?.board || null;
  }
}

export const listRepository = new ListRepository();
