import api from './api';

export interface Board {
  idBoard: number;
  boardName: string;
  visibility: string;
  backgroundUrl?: string;
  createdAt: Date;
  workspace: {
    idWorkspace: number;
    name: string;
  };
  createdBy: {
    idUser: number;
    name: string;
  };
}

export interface CreateBoardInput {
  boardName: string;
  idWorkspace: number;
  visibility?: 'workspace' | 'private' | 'public';
  backgroundUrl?: string;
}

export interface UpdateBoardInput {
  boardName?: string;
  visibility?: 'workspace' | 'private' | 'public';
  backgroundUrl?: string;
}

// Lấy danh sách boards trong workspace
export const getBoardsByWorkspace = async (workspaceId: number): Promise<Board[]> => {
  const response = await api.get(`/boards/workspace/${workspaceId}`);
  return response.data.data;
};

// Lấy chi tiết board
export const getBoardById = async (id: number): Promise<Board> => {
  const response = await api.get(`/boards/${id}`);
  return response.data.data;
};

// Tạo board mới
export const createBoard = async (data: CreateBoardInput): Promise<Board> => {
  const response = await api.post('/boards', data);
  return response.data.data;
};

// Cập nhật board
export const updateBoard = async (id: number, data: UpdateBoardInput): Promise<Board> => {
  const response = await api.put(`/boards/${id}`, data);
  return response.data.data;
};

// Xóa board
export const deleteBoard = async (id: number): Promise<void> => {
  await api.delete(`/boards/${id}`);
};
