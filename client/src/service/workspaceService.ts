import api from './api';

export interface Workspace {
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

export interface CreateWorkspaceInput {
  name: string;
  avatarUrl?: string;
  tier?: string;
  status?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  avatarUrl?: string;
  tier?: string;
  status?: string;
}

export const getMyWorkspaces = async (): Promise<Workspace[]> => {
  const response = await api.get('/workspaces');
  return response.data.data;
};

export const getWorkspaceById = async (id: number): Promise<Workspace> => {
  const response = await api.get(`/workspaces/${id}`);
  return response.data.data;
};

export const createWorkspace = async (data: CreateWorkspaceInput): Promise<Workspace> => {
  const response = await api.post('/workspaces', data);
  return response.data.data;
};

export const updateWorkspace = async (id: number, data: UpdateWorkspaceInput): Promise<Workspace> => {
  const response = await api.put(`/workspaces/${id}`, data);
  return response.data.data;
};

export const deleteWorkspace = async (id: number): Promise<void> => {
  await api.delete(`/workspaces/${id}`);
};
