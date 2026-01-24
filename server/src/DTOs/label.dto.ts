// DTO cho label
export interface LabelDTO {
  idLabel: number;
  name: string;
  color: string;
  board: {
    idBoard: number;
    boardName: string;
  };
}

// DTO cho request tạo label
export interface CreateLabelDTO {
  name: string;
  color: string;
  idBoard: number;
}

// DTO cho request cập nhật label
export interface UpdateLabelDTO {
  name?: string;
  color?: string;
}
