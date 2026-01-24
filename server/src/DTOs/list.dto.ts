// DTO cho list
export interface ListDTO {
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

// DTO cho request tạo list
export interface CreateListDTO {
  listName: string;
  idBoard: number;
  position?: number;
}

// DTO cho request cập nhật list
export interface UpdateListDTO {
  listName?: string;
  position?: number;
}
