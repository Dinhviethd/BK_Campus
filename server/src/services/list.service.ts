import { ListRepository, listRepository } from '@/repositories/list.repository';
import { BoardRepository, boardRepository } from '@/repositories/board.repository';
import { CreateListInput, UpdateListInput } from '@/schemas/list.schema';
import { ListDTO } from '@/DTOs/list.dto';
import { AppError } from '@/utils/error.response';
import { List } from '@/models/list.model';

export class ListService {
  private listRepo: ListRepository;
  private boardRepo: BoardRepository;

  constructor() {
    this.listRepo = listRepository;
    this.boardRepo = boardRepository;
  }

  // Lấy danh sách lists trong board
  async getListsByBoardId(boardId: number, userId: number): Promise<ListDTO[]> {
    // Kiểm tra quyền truy cập board
    const board = await this.boardRepo.findById(boardId);
    if (!board || board.deleteAt) {
      throw new AppError(404, 'Board không tồn tại');
    }

    const isInBoard = await this.boardRepo.isUserInBoard(userId, boardId);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền truy cập board này');
    }

    const lists = await this.listRepo.findByBoardId(boardId);
    return lists.map(this.toListDTO);
  }

  // Tạo list mới
  async createList(userId: number, input: CreateListInput): Promise<ListDTO> {
    // Kiểm tra board tồn tại
    const board = await this.boardRepo.findById(input.idBoard);
    if (!board || board.deleteAt) {
      throw new AppError(404, 'Board không tồn tại');
    }

    // Kiểm tra user có trong board không
    const isInBoard = await this.boardRepo.isUserInBoard(userId, input.idBoard);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền tạo list trong board này');
    }

    // Kiểm tra quyền tạo list
    const role = await this.boardRepo.getUserBoardRole(userId, input.idBoard);
    if (!role) {
      throw new AppError(403, 'Bạn không có quyền tạo list');
    }

    // Lấy position tiếp theo nếu không được chỉ định
    const position = input.position ?? await this.listRepo.getNextPosition(input.idBoard);

    // Tạo list
    const list = await this.listRepo.create({
      listName: input.listName,
      position,
      board: { idBoard: input.idBoard } as any,
    });

    // Lấy lại list với relations
    const createdList = await this.listRepo.findById(list.idList);
    if (!createdList) {
      throw new AppError(500, 'Không thể tạo list');
    }

    return this.toListDTO(createdList);
  }

  // Cập nhật list
  async updateList(listId: number, userId: number, input: UpdateListInput): Promise<ListDTO> {
    const list = await this.listRepo.findById(listId);
    if (!list || list.deleteAt) {
      throw new AppError(404, 'List không tồn tại');
    }

    // Kiểm tra quyền
    const isInBoard = await this.boardRepo.isUserInBoard(userId, list.board.idBoard);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền cập nhật list này');
    }

    const updatedList = await this.listRepo.update(listId, input);
    if (!updatedList) {
      throw new AppError(500, 'Không thể cập nhật list');
    }

    return this.toListDTO(updatedList);
  }

  // Xóa list
  async deleteList(listId: number, userId: number): Promise<boolean> {
    const list = await this.listRepo.findById(listId);
    if (!list || list.deleteAt) {
      throw new AppError(404, 'List không tồn tại');
    }

    // Kiểm tra quyền
    const isInBoard = await this.boardRepo.isUserInBoard(userId, list.board.idBoard);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền xóa list này');
    }

    return this.listRepo.softDelete(listId);
  }

  // Archive list
  async archiveList(listId: number, userId: number): Promise<boolean> {
    const list = await this.listRepo.findById(listId);
    if (!list || list.deleteAt) {
      throw new AppError(404, 'List không tồn tại');
    }

    const isInBoard = await this.boardRepo.isUserInBoard(userId, list.board.idBoard);
    if (!isInBoard) {
      throw new AppError(403, 'Bạn không có quyền archive list này');
    }

    return this.listRepo.archive(listId);
  }

  private toListDTO(list: List): ListDTO {
    return {
      idList: list.idList,
      listName: list.listName,
      position: list.position,
      createdAt: list.createdAt,
      archivedAt: list.archivedAt,
      board: {
        idBoard: list.board.idBoard,
        boardName: list.board.boardName,
      },
    };
  }
}

export const listService = new ListService();
