import { BoardRepository, boardRepository } from '@/repositories/board.repository';
import { CreateBoardInput, UpdateBoardInput } from '@/schemas/board.schema';
import { BoardDTO } from '@/DTOs/board.dto';
import { AppError } from '@/utils/error.response';
import { Board } from '@/models/board.model';
import { TypeVisibility } from '@/constants/constants';

export class BoardService {
  private boardRepo: BoardRepository;

  constructor() {
    this.boardRepo = boardRepository;
  }

  // Lấy danh sách boards trong workspace
  async getBoardsByWorkspaceId(workspaceId: number, userId: number): Promise<BoardDTO[]> {
    // Kiểm tra user có trong workspace không
    const isUserInWorkspace = await this.boardRepo.isUserInWorkspace(userId, workspaceId);
    if (!isUserInWorkspace) {
      throw new AppError(403, 'Bạn không có quyền truy cập workspace này');
    }

    const boards = await this.boardRepo.findByUserIdAndWorkspaceId(userId, workspaceId);
    return boards.map(this.toBoardDTO);
  }

  // Lấy chi tiết board
  async getBoardById(boardId: number, userId: number): Promise<BoardDTO> {
    const board = await this.boardRepo.findById(boardId);

    if (!board || board.deleteAt) {
      throw new AppError(404, 'Board không tồn tại');
    }

    // Kiểm tra quyền truy cập
    const hasAccess = await this.checkBoardAccess(board, userId);
    if (!hasAccess) {
      throw new AppError(403, 'Bạn không có quyền truy cập board này');
    }

    return this.toBoardDTO(board);
  }

  // Tạo board mới
  async createBoard(userId: number, input: CreateBoardInput): Promise<BoardDTO> {
    // Kiểm tra user có trong workspace không
    const isUserInWorkspace = await this.boardRepo.isUserInWorkspace(userId, input.idWorkspace);
    if (!isUserInWorkspace) {
      throw new AppError(403, 'Bạn không có quyền tạo board trong workspace này');
    }

    // Kiểm tra quyền tạo board (workspace_admin hoặc workspace_member có quyền board:create)
    const userRole = await this.boardRepo.getUserWorkspaceRole(userId, input.idWorkspace);
    if (!userRole) {
      throw new AppError(403, 'Bạn không có quyền tạo board');
    }

    // Tạo board
    const board = await this.boardRepo.create({
      boardName: input.boardName,
      visibility: input.visibility || TypeVisibility.WORKSPACE,
      backgroundUrl: input.backgroundUrl,
      workspace: { idWorkspace: input.idWorkspace } as any,
      createdBy: { idUser: userId } as any,
    });

    // Tìm role board_admin
    const boardAdminRole = await this.boardRepo.findRoleByName('board_admin');
    if (!boardAdminRole) {
      throw new AppError(500, 'Role board_admin không tồn tại. Vui lòng chạy npm run seed');
    }

    // Thêm user vào board với role admin
    await this.boardRepo.addUserToBoard(userId, board.idBoard, boardAdminRole.idRole);

    // Lấy lại board với đầy đủ relations
    const createdBoard = await this.boardRepo.findById(board.idBoard);
    if (!createdBoard) {
      throw new AppError(500, 'Không thể tạo board');
    }

    return this.toBoardDTO(createdBoard);
  }

  // Cập nhật board
  async updateBoard(boardId: number, userId: number, input: UpdateBoardInput): Promise<BoardDTO> {
    const board = await this.boardRepo.findById(boardId);

    if (!board || board.deleteAt) {
      throw new AppError(404, 'Board không tồn tại');
    }

    // Kiểm tra quyền (chỉ board_admin hoặc creator mới có thể cập nhật)
    const hasEditPermission = await this.checkBoardEditPermission(board, userId);
    if (!hasEditPermission) {
      throw new AppError(403, 'Bạn không có quyền cập nhật board này');
    }

    const updatedBoard = await this.boardRepo.update(boardId, input);

    if (!updatedBoard) {
      throw new AppError(500, 'Không thể cập nhật board');
    }

    return this.toBoardDTO(updatedBoard);
  }

  // Xóa board
  async deleteBoard(boardId: number, userId: number): Promise<void> {
    const board = await this.boardRepo.findById(boardId);

    if (!board || board.deleteAt) {
      throw new AppError(404, 'Board không tồn tại');
    }

    // Kiểm tra quyền (chỉ board_admin, creator, hoặc workspace_admin mới có thể xóa)
    const hasDeletePermission = await this.checkBoardDeletePermission(board, userId);
    if (!hasDeletePermission) {
      throw new AppError(403, 'Bạn không có quyền xóa board này');
    }

    await this.boardRepo.softDelete(boardId);
  }

  // Kiểm tra quyền truy cập board
  private async checkBoardAccess(board: Board, userId: number): Promise<boolean> {
    // Nếu board public, ai cũng có thể xem
    if (board.visibility === TypeVisibility.PUBLIC) {
      return true;
    }

    // Nếu board thuộc workspace, user trong workspace có thể xem
    if (board.visibility === TypeVisibility.WORKSPACE) {
      return await this.boardRepo.isUserInWorkspace(userId, board.workspace.idWorkspace);
    }

    // Nếu board private, chỉ user trong board mới có thể xem
    if (board.visibility === TypeVisibility.PRIVATE) {
      return await this.boardRepo.isUserInBoard(userId, board.idBoard);
    }

    return false;
  }

  // Kiểm tra quyền chỉnh sửa board
  private async checkBoardEditPermission(board: Board, userId: number): Promise<boolean> {
    // Creator luôn có quyền
    if (board.createdBy.idUser === userId) {
      return true;
    }

    // Board admin có quyền
    const boardRole = await this.boardRepo.getUserBoardRole(userId, board.idBoard);
    if (boardRole && boardRole.name === 'board_admin') {
      return true;
    }

    // Workspace admin có quyền
    const workspaceRole = await this.boardRepo.getUserWorkspaceRole(userId, board.workspace.idWorkspace);
    if (workspaceRole && workspaceRole.name === 'workspace_admin') {
      return true;
    }

    return false;
  }

  // Kiểm tra quyền xóa board
  private async checkBoardDeletePermission(board: Board, userId: number): Promise<boolean> {
    // Chỉ creator hoặc workspace_admin mới có quyền xóa
    if (board.createdBy.idUser === userId) {
      return true;
    }

    const workspaceRole = await this.boardRepo.getUserWorkspaceRole(userId, board.workspace.idWorkspace);
    if (workspaceRole && workspaceRole.name === 'workspace_admin') {
      return true;
    }

    return false;
  }

  // Chuyển đổi Board entity sang DTO
  private toBoardDTO(board: Board): BoardDTO {
    return {
      idBoard: board.idBoard,
      boardName: board.boardName,
      visibility: board.visibility,
      backgroundUrl: board.backgroundUrl,
      createdAt: board.createdAt,
      workspace: {
        idWorkspace: board.workspace.idWorkspace,
        name: board.workspace.name,
      },
      createdBy: {
        idUser: board.createdBy.idUser,
        name: board.createdBy.name,
      },
    };
  }
}

export const boardService = new BoardService();
