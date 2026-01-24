import { Repository } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { Workspace } from '@/models/workspace.model';
import { WorkspaceUser } from '@/models/workspace_user.model';
import { Role } from '@/models/role.model';

export class WorkspaceRepository {
  private repository: Repository<Workspace>;
  private workspaceUserRepository: Repository<WorkspaceUser>;
  private roleRepository: Repository<Role>;

  constructor() {
    this.repository = AppDataSource.getRepository(Workspace);
    this.workspaceUserRepository = AppDataSource.getRepository(WorkspaceUser);
    this.roleRepository = AppDataSource.getRepository(Role);
  }

  async findByUserId(userId: number): Promise<Workspace[]> {
    const workspaceUsers = await this.workspaceUserRepository.find({
      where: { idUser: userId },
      relations: ['workspace', 'workspace.createdBy'],
    });

    return workspaceUsers
      .map(wu => wu.workspace)
      .filter(w => w.deleteAt === null || w.deleteAt === undefined);
  }

  // Lấy workspace theo ID
  async findById(idWorkspace: number): Promise<Workspace | null> {
    return this.repository.findOne({
      where: { idWorkspace },
      relations: ['createdBy'],
    });
  }

  // Tạo workspace mới
  async create(workspaceData: Partial<Workspace>): Promise<Workspace> {
    const workspace = this.repository.create(workspaceData);
    return this.repository.save(workspace);
  }

  // Thêm user vào workspace
  async addUserToWorkspace(userId: number, workspaceId: number, roleId: number): Promise<WorkspaceUser> {
    const workspaceUser = this.workspaceUserRepository.create({
      idUser: userId,
      idWorkspace: workspaceId,
      idRole: roleId,
    });
    return this.workspaceUserRepository.save(workspaceUser);
  }

  // Cập nhật workspace
  async update(idWorkspace: number, updateData: Partial<Workspace>): Promise<Workspace | null> {
    await this.repository.update(idWorkspace, updateData);
    return this.findById(idWorkspace);
  }

  // Xóa mềm workspace
  async softDelete(idWorkspace: number): Promise<boolean> {
    const result = await this.repository.update(idWorkspace, { deleteAt: new Date() });
    return result.affected !== 0;
  }

  // Kiểm tra user có trong workspace không
  async isUserInWorkspace(userId: number, workspaceId: number): Promise<boolean> {
    const count = await this.workspaceUserRepository.count({
      where: { idUser: userId, idWorkspace: workspaceId },
    });
    return count > 0;
  }

  // Lấy role theo tên
  async findRoleByName(name: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { name } });
  }
}

export const workspaceRepository = new WorkspaceRepository();
