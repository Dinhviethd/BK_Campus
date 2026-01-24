import api from './api';

export interface List {
  idList: number;
  listName: string;
  position: number;
  createdAt: Date;
  archivedAt?: Date;
  board: {
    idBoard: number;
    boardName: string;
  };
}

export interface CreateListInput {
  listName: string;
  idBoard: number;
  position?: number;
}

export interface UpdateListInput {
  listName?: string;
  position?: number;
}

// Lấy danh sách lists trong board
export const getListsByBoard = async (boardId: number): Promise<List[]> => {
  const response = await api.get(`/lists/board/${boardId}`);
  return response.data.data;
};

// Tạo list mới
export const createList = async (data: CreateListInput): Promise<List> => {
  const response = await api.post('/lists', data);
  return response.data.data;
};

// Cập nhật list
export const updateList = async (id: number, data: UpdateListInput): Promise<List> => {
  const response = await api.put(`/lists/${id}`, data);
  return response.data.data;
};

// Xóa list
export const deleteList = async (id: number): Promise<void> => {
  await api.delete(`/lists/${id}`);
};

// Archive list
export const archiveList = async (id: number): Promise<void> => {
  await api.post(`/lists/${id}/archive`);
};
