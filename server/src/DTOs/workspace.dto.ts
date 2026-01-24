// DTO cho workspace
export interface WorkspaceDTO {
  idWorkspace: number;
  name: string;
  avatarUrl?: string;
  tier: string;
  status: string;
  createdAt: Date;
  createdBy: {
    idUser: number;
    name: string;
  };
}

// DTO cho request tạo workspace
export interface CreateWorkspaceDTO {
  name: string;
  avatarUrl?: string;
  tier?: string;
  status?: string;
}

// DTO cho request cập nhật workspace
export interface UpdateWorkspaceDTO {
  name?: string;
  avatarUrl?: string;
  tier?: string;
  status?: string;
}
