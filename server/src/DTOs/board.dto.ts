// DTO cho board
export interface BoardDTO {
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

// DTO cho request tạo board
export interface CreateBoardDTO {
  boardName: string;
  visibility?: string;
  backgroundUrl?: string;
  idWorkspace: number;
}

// DTO cho request cập nhật board
export interface UpdateBoardDTO {
  boardName?: string;
  visibility?: string;
  backgroundUrl?: string;
}
