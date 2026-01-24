import api from './api';
import type { Card } from './cardService';

export interface Label {
  idLabel: number;
  name: string;
  color: string;
  board: {
    idBoard: number;
    boardName: string;
  };
}

export interface CreateLabelInput {
  name: string;
  color: string;
  idBoard: number;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
}

// Lấy danh sách labels trong board
export const getLabelsByBoard = async (boardId: number): Promise<Label[]> => {
  const response = await api.get(`/labels/board/${boardId}`);
  return response.data.data;
};

// Tạo label mới
export const createLabel = async (data: CreateLabelInput): Promise<Label> => {
  const response = await api.post('/labels', data);
  return response.data.data;
};

// Cập nhật label
export const updateLabel = async (id: number, data: UpdateLabelInput): Promise<Label> => {
  const response = await api.put(`/labels/${id}`, data);
  return response.data.data;
};

// Xóa label
export const deleteLabel = async (id: number): Promise<void> => {
  await api.delete(`/labels/${id}`);
};

// Thêm label vào card
export const addLabelToCard = async (cardId: number, labelId: number): Promise<Card> => {
  const response = await api.post(`/labels/card/${cardId}`, { idLabel: labelId });
  return response.data.data;
};

// Xóa label khỏi card
export const removeLabelFromCard = async (cardId: number, labelId: number): Promise<Card> => {
  const response = await api.delete(`/labels/card/${cardId}/${labelId}`);
  return response.data.data;
};

// Preset colors for labels
export const LABEL_COLORS = [
  { name: 'Xanh lá', value: '#22c55e' },
  { name: 'Vàng', value: '#eab308' },
  { name: 'Cam', value: '#f97316' },
  { name: 'Đỏ', value: '#ef4444' },
  { name: 'Tím', value: '#a855f7' },
  { name: 'Xanh dương', value: '#3b82f6' },
  { name: 'Xanh cyan', value: '#06b6d4' },
  { name: 'Hồng', value: '#ec4899' },
  { name: 'Xám', value: '#6b7280' },
  { name: 'Đen', value: '#1f2937' },
];
