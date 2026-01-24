// DTO cho card
export interface CardDTO {
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

// DTO cho request tạo card
export interface CreateCardDTO {
  cardName: string;
  description?: string;
  dueDate?: Date;
  idList: number;
  position?: number;
}

// DTO cho request cập nhật card
export interface UpdateCardDTO {
  cardName?: string;
  description?: string;
  dueDate?: Date;
  position?: number;
  isArchived?: boolean;
  attachmentUrl?: string;
}

// DTO cho request di chuyển card
export interface MoveCardDTO {
  idList: number;
  position: number;
}
