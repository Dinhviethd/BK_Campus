import { Repository } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { Board } from '@/models/board.model';
import { BoardUser } from '@/models/board_user.model';
import { Role } from '@/models/role.model';
import { WorkspaceUser } from '@/models/workspace_user.model';

export class BoardRepository {
  private repository: Repository<Board>;
  private boardUserRepository: Repository<BoardUser>;
  private roleRepository: Repository<Role>;
  private workspaceUserRepository: Repository<WorkspaceUser>;

  constructor() {
    this.repository = AppDataSource.getRepository(Board);
    this.boardUserRepository = AppDataSource.getRepository(BoardUser);
    this.roleRepository = AppDataSource.getRepository(Role);
    this.workspaceUserRepository = AppDataSource.getRepository(WorkspaceUser);
  }

  // Lấy tất cả boards trong workspace
  async findByWorkspaceId(workspaceId: number): Promise<Board[]> {
    return this.repository.find({
      where: { 
        workspace: { idWorkspace: workspaceId },
        deleteAt: undefined,
      },
      relations: ['workspace', 'createdBy'],
    });
  }

  // Lấy boards mà user có quyền truy cập trong workspace
  async findByUserIdAndWorkspaceId(userId: number, workspaceId: number): Promise<Board[]> {
    // Lấy boards user được gán trực tiếp
    const boardUsers = await this.boardUserRepository.find({
      where: { user: { idUser: userId } },
      relations: ['board', 'board.workspace', 'board.createdBy'],
    });

    const userBoards = boardUsers
      .map(bu => bu.board)
      .filter(b => b.workspace.idWorkspace === workspaceId && !b.deleteAt);

    // Lấy boards public/workspace trong workspace đó
    const workspaceBoards = await this.repository.find({
      where: { 
        workspace: { idWorkspace: workspaceId },
        deleteAt: undefined,
      },
      relations: ['workspace', 'createdBy'],
    });

    // Merge và loại bỏ trùng lặp
    const allBoards = [...userBoards];
    for (const board of workspaceBoards) {
      if (!allBoards.some(b => b.idBoard === board.idBoard)) {
        allBoards.push(board);
      }
    }

    return allBoards;
  }

  // Lấy board theo ID
  async findById(idBoard: number): Promise<Board | null> {
    return this.repository.findOne({
      where: { idBoard },
      relations: ['workspace', 'createdBy'],
    });
  }

  // Tạo board mới
  async create(boardData: Partial<Board>): Promise<Board> {
    const board = this.repository.create(boardData);
    return this.repository.save(board);
  }

  // Thêm user vào board với role
  async addUserToBoard(userId: number, boardId: number, roleId: number): Promise<BoardUser> {
    const boardUser = this.boardUserRepository.create({
      board: { idBoard: boardId },
      user: { idUser: userId },
      role: { idRole: roleId },
    });
    return this.boardUserRepository.save(boardUser);
  }

  // Cập nhật board
  async update(idBoard: number, updateData: Partial<Board>): Promise<Board | null> {
    await this.repository.update(idBoard, updateData);
    return this.findById(idBoard);
  }

  // Xóa mềm board
  async softDelete(idBoard: number): Promise<boolean> {
    const result = await this.repository.update(idBoard, { deleteAt: new Date() });
    return result.affected !== 0;
  }

  // Kiểm tra user có trong board không
  async isUserInBoard(userId: number, boardId: number): Promise<boolean> {
    const count = await this.boardUserRepository.count({
      where: { user: { idUser: userId }, board: { idBoard: boardId } },
    });
    return count > 0;
  }

  // Kiểm tra user có trong workspace không
  async isUserInWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    const count = await this.workspaceUserRepository.count({
      where: { idUser: userId, idWorkspace: workspaceId },
    });
    return count > 0;
  }

  // Lấy role của user trong workspace
  async getUserWorkspaceRole(userId: number, workspaceId: number): Promise<Role | null> {
    const workspaceUser = await this.workspaceUserRepository.findOne({
      where: { idUser: userId, idWorkspace: workspaceId },
      relations: ['role'],
    });
    return workspaceUser?.role || null;
  }

  // Lấy role theo tên
  async findRoleByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }

  // Lấy role của user trong board
  async getUserBoardRole(userId: number, boardId: number): Promise<Role | null> {
    const boardUser = await this.boardUserRepository.findOne({
      where: { user: { idUser: userId }, board: { idBoard: boardId } },
      relations: ['role'],
    });
    return boardUser?.role || null;
  }
}

export const boardRepository = new BoardRepository();
