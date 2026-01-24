import { WorkspaceRepository, workspaceRepository } from '@/repositories/workspace.repository';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from '@/schemas/workspace.schema';
import { WorkspaceDTO } from '@/DTOs/workspace.dto';
import { AppError } from '@/utils/error.response';
import { Workspace } from '@/models/workspace.model';
import { TierWorkspace, Visibility } from '@/constants/constants';

export class WorkspaceService {
  private workspaceRepo: WorkspaceRepository;

  constructor() {
    this.workspaceRepo = workspaceRepository;
  }

  async getWorkspacesByUserId(userId: number): Promise<WorkspaceDTO[]> {
    const workspaces = await this.workspaceRepo.findByUserId(userId);
    return workspaces.map(this.toWorkspaceDTO);
  }

  async getWorkspaceById(workspaceId: number, userId: number): Promise<WorkspaceDTO> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    
    if (!workspace) {
      throw new AppError(404, 'Workspace không tồn tại');
    }

    const isUserInWorkspace = await this.workspaceRepo.isUserInWorkspace(userId, workspaceId);
    if (!isUserInWorkspace && workspace.status !== Visibility.PUBLIC) {
      throw new AppError(403, 'Bạn không có quyền truy cập workspace này');
    }

    return this.toWorkspaceDTO(workspace);
  }

  async createWorkspace(userId: number, input: CreateWorkspaceInput): Promise<WorkspaceDTO> {
    const workspace = await this.workspaceRepo.create({
      name: input.name,
      avatarUrl: input.avatarUrl,
      tier: input.tier || TierWorkspace.FREE,
      status: input.status || Visibility.PRIVATE,
      createdBy: { idUser: userId } as any,
    });

    const adminRole = await this.workspaceRepo.findRoleByName('workspace_admin');
    if (!adminRole) {
      throw new AppError(500, 'Role workspace_admin không tồn tại. Vui lòng chạy npm run seed');
    }

    await this.workspaceRepo.addUserToWorkspace(userId, workspace.idWorkspace, adminRole.idRole);

    return this.toWorkspaceDTO(workspace);
  }

  async updateWorkspace(workspaceId: number, userId: number, input: UpdateWorkspaceInput): Promise<WorkspaceDTO> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    
    if (!workspace) {
      throw new AppError(404, 'Workspace không tồn tại');
    }

    if (workspace.createdBy.idUser !== userId) {
      throw new AppError(403, 'Bạn không có quyền cập nhật workspace này');
    }

    const updatedWorkspace = await this.workspaceRepo.update(workspaceId, input);
    
    if (!updatedWorkspace) {
      throw new AppError(500, 'Không thể cập nhật workspace');
    }

    return this.toWorkspaceDTO(updatedWorkspace);
  }

  async deleteWorkspace(workspaceId: number, userId: number): Promise<void> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    
    if (!workspace) {
      throw new AppError(404, 'Workspace không tồn tại');
    }

    if (workspace.createdBy.idUser !== userId) {
      throw new AppError(403, 'Bạn không có quyền xóa workspace này');
    }

    await this.workspaceRepo.softDelete(workspaceId);
  }

  private toWorkspaceDTO(workspace: Workspace): WorkspaceDTO {
    return {
      idWorkspace: workspace.idWorkspace,
      name: workspace.name,
      avatarUrl: workspace.avatarUrl,
      tier: workspace.tier,
      status: workspace.status,
      createdAt: workspace.createdAt,
      createdBy: {
        idUser: workspace.createdBy?.idUser,
        name: workspace.createdBy?.name,
      },
    };
  }
}

export const workspaceService = new WorkspaceService();
