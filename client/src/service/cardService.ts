import api from './api';

export interface Card {
  idCard: number;
  cardName: string;
  description?: string;
  dueDate?: Date;
  position: number;
  isArchived: boolean;
  attachmentUrl?: string;
  createdAt: Date;
  list: {
    idList: number;
    listName: string;
  };
  createdBy: {
    idUser: number;
    name: string;
  };
  labels?: {
    idLabel: number;
    name: string;
    color: string;
  }[];
}

export interface CreateCardInput {
  cardName: string;
  description?: string;
  dueDate?: Date;
  idList: number;
  position?: number;
}

export interface UpdateCardInput {
  cardName?: string;
  description?: string;
  dueDate?: Date;
  position?: number;
  isArchived?: boolean;
  attachmentUrl?: string;
}

export interface MoveCardInput {
  idList: number;
  position: number;
}

// Lấy chi tiết card
export const getCardById = async (id: number): Promise<Card> => {
  const response = await api.get(`/cards/${id}`);
  return response.data.data;
};

// Lấy danh sách cards trong list
export const getCardsByList = async (listId: number): Promise<Card[]> => {
  const response = await api.get(`/cards/list/${listId}`);
  return response.data.data;
};

// Lấy danh sách cards trong board
export const getCardsByBoard = async (boardId: number): Promise<Card[]> => {
  const response = await api.get(`/cards/board/${boardId}`);
  return response.data.data;
};

// Tạo card mới
export const createCard = async (data: CreateCardInput): Promise<Card> => {
  const response = await api.post('/cards', data);
  return response.data.data;
};

// Cập nhật card
export const updateCard = async (id: number, data: UpdateCardInput): Promise<Card> => {
  const response = await api.put(`/cards/${id}`, data);
  return response.data.data;
};

// Di chuyển card
export const moveCard = async (id: number, data: MoveCardInput): Promise<Card> => {
  const response = await api.post(`/cards/${id}/move`, data);
  return response.data.data;
};

// Xóa card
export const deleteCard = async (id: number): Promise<void> => {
  await api.delete(`/cards/${id}`);
};

// Archive card
export const archiveCard = async (id: number): Promise<void> => {
  await api.post(`/cards/${id}/archive`);
};

// Unarchive card
export const unarchiveCard = async (id: number): Promise<void> => {
  await api.post(`/cards/${id}/unarchive`);
};
