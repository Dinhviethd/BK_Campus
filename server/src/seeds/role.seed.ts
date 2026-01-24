import { AppDataSource } from '@/configs/database.config';
import { Role } from '@/models/role.model';
import { Permission } from '@/models/permission.model';
import { RoleScope } from '@/constants/constants';

const PERMISSIONS = {
  // Workspace permissions
  WORKSPACE_VIEW: 'workspace:view',
  WORKSPACE_EDIT: 'workspace:edit',
  WORKSPACE_DELETE: 'workspace:delete',
  WORKSPACE_INVITE: 'workspace:invite',
  WORKSPACE_REMOVE_MEMBER: 'workspace:remove_member',
  
  // Board permissions
  BOARD_CREATE: 'board:create',
  BOARD_VIEW: 'board:view',
  BOARD_EDIT: 'board:edit',
  BOARD_DELETE: 'board:delete',
  BOARD_INVITE: 'board:invite',
  
  // List permissions
  LIST_CREATE: 'list:create',
  LIST_EDIT: 'list:edit',
  LIST_DELETE: 'list:delete',
  LIST_MOVE: 'list:move',
  
  // Card permissions
  CARD_CREATE: 'card:create',
  CARD_VIEW: 'card:view',
  CARD_EDIT: 'card:edit',
  CARD_DELETE: 'card:delete',
  CARD_MOVE: 'card:move',
  CARD_ASSIGN: 'card:assign',
  
  // Comment permissions
  COMMENT_CREATE: 'comment:create',
  COMMENT_EDIT_OWN: 'comment:edit_own',
  COMMENT_DELETE_OWN: 'comment:delete_own',
  COMMENT_DELETE_ANY: 'comment:delete_any',
};

export async function seedPermissions() {
  const permissionRepository = AppDataSource.getRepository(Permission);

  const existingPermissions = await permissionRepository.count();
  if (existingPermissions > 0) {
    console.log('Permissions already exist, skipping seed...');
    return;
  }

  const permissionsData = [
    // Workspace permissions
    { code: PERMISSIONS.WORKSPACE_VIEW, description: 'Xem workspace' },
    { code: PERMISSIONS.WORKSPACE_EDIT, description: 'Chỉnh sửa workspace' },
    { code: PERMISSIONS.WORKSPACE_DELETE, description: 'Xóa workspace' },
    { code: PERMISSIONS.WORKSPACE_INVITE, description: 'Mời thành viên vào workspace' },
    { code: PERMISSIONS.WORKSPACE_REMOVE_MEMBER, description: 'Xóa thành viên khỏi workspace' },
    
    // Board permissions
    { code: PERMISSIONS.BOARD_CREATE, description: 'Tạo board mới' },
    { code: PERMISSIONS.BOARD_VIEW, description: 'Xem board' },
    { code: PERMISSIONS.BOARD_EDIT, description: 'Chỉnh sửa board' },
    { code: PERMISSIONS.BOARD_DELETE, description: 'Xóa board' },
    { code: PERMISSIONS.BOARD_INVITE, description: 'Mời thành viên vào board' },
    
    // List permissions
    { code: PERMISSIONS.LIST_CREATE, description: 'Tạo list mới' },
    { code: PERMISSIONS.LIST_EDIT, description: 'Chỉnh sửa list' },
    { code: PERMISSIONS.LIST_DELETE, description: 'Xóa list' },
    { code: PERMISSIONS.LIST_MOVE, description: 'Di chuyển list' },
    
    // Card permissions
    { code: PERMISSIONS.CARD_CREATE, description: 'Tạo card mới' },
    { code: PERMISSIONS.CARD_VIEW, description: 'Xem card' },
    { code: PERMISSIONS.CARD_EDIT, description: 'Chỉnh sửa card' },
    { code: PERMISSIONS.CARD_DELETE, description: 'Xóa card' },
    { code: PERMISSIONS.CARD_MOVE, description: 'Di chuyển card' },
    { code: PERMISSIONS.CARD_ASSIGN, description: 'Gán thành viên vào card' },
    
    // Comment permissions
    { code: PERMISSIONS.COMMENT_CREATE, description: 'Tạo comment' },
    { code: PERMISSIONS.COMMENT_EDIT_OWN, description: 'Chỉnh sửa comment của mình' },
    { code: PERMISSIONS.COMMENT_DELETE_OWN, description: 'Xóa comment của mình' },
    { code: PERMISSIONS.COMMENT_DELETE_ANY, description: 'Xóa bất kỳ comment nào' },
  ];

  for (const permData of permissionsData) {
    const permission = permissionRepository.create(permData);
    await permissionRepository.save(permission);
  }

  console.log('Permissions seeded successfully!');
}

export async function seedRoles() {
  const roleRepository = AppDataSource.getRepository(Role);
  const permissionRepository = AppDataSource.getRepository(Permission);

  // Kiểm tra xem đã có role nào chưa
  const existingRoles = await roleRepository.count();
  if (existingRoles > 0) {
    console.log('Roles already exist, skipping seed...');
    return;
  }

  // Lấy tất cả permissions
  const allPermissions = await permissionRepository.find();
  const getPermissionsByCode = (codes: string[]) => 
    allPermissions.filter(p => codes.includes(p.code));

  const roles = [
    {
      name: 'workspace_admin',
      scope: RoleScope.WORKSPACE,
      description: 'Admin của workspace, có toàn quyền quản lý',
      permissions: getPermissionsByCode([
        PERMISSIONS.WORKSPACE_VIEW,
        PERMISSIONS.WORKSPACE_EDIT,
        PERMISSIONS.WORKSPACE_DELETE,
        PERMISSIONS.WORKSPACE_INVITE,
        PERMISSIONS.WORKSPACE_REMOVE_MEMBER,
        PERMISSIONS.BOARD_CREATE,
        PERMISSIONS.BOARD_VIEW,
        PERMISSIONS.BOARD_EDIT,
        PERMISSIONS.BOARD_DELETE,
        PERMISSIONS.BOARD_INVITE,
      ]),
    },
    {
      name: 'workspace_member',
      scope: RoleScope.WORKSPACE,
      description: 'Thành viên workspace, có quyền xem và tham gia',
      permissions: getPermissionsByCode([
        PERMISSIONS.WORKSPACE_VIEW,
        PERMISSIONS.BOARD_CREATE,
        PERMISSIONS.BOARD_VIEW,
      ]),
    },
    {
      name: 'board_admin',
      scope: RoleScope.BOARD,
      description: 'Admin của board, có toàn quyền quản lý board',
      permissions: getPermissionsByCode([
        PERMISSIONS.BOARD_VIEW,
        PERMISSIONS.BOARD_EDIT,
        PERMISSIONS.BOARD_DELETE,
        PERMISSIONS.BOARD_INVITE,
        PERMISSIONS.LIST_CREATE,
        PERMISSIONS.LIST_EDIT,
        PERMISSIONS.LIST_DELETE,
        PERMISSIONS.LIST_MOVE,
        PERMISSIONS.CARD_CREATE,
        PERMISSIONS.CARD_VIEW,
        PERMISSIONS.CARD_EDIT,
        PERMISSIONS.CARD_DELETE,
        PERMISSIONS.CARD_MOVE,
        PERMISSIONS.CARD_ASSIGN,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_EDIT_OWN,
        PERMISSIONS.COMMENT_DELETE_OWN,
        PERMISSIONS.COMMENT_DELETE_ANY,
      ]),
    },
    {
      name: 'board_member',
      scope: RoleScope.BOARD,
      description: 'Thành viên board, có quyền xem và chỉnh sửa',
      permissions: getPermissionsByCode([
        PERMISSIONS.BOARD_VIEW,
        PERMISSIONS.LIST_CREATE,
        PERMISSIONS.LIST_EDIT,
        PERMISSIONS.LIST_MOVE,
        PERMISSIONS.CARD_CREATE,
        PERMISSIONS.CARD_VIEW,
        PERMISSIONS.CARD_EDIT,
        PERMISSIONS.CARD_MOVE,
        PERMISSIONS.CARD_ASSIGN,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_EDIT_OWN,
        PERMISSIONS.COMMENT_DELETE_OWN,
      ]),
    },
    {
      name: 'board_viewer',
      scope: RoleScope.BOARD,
      description: 'Người xem board, chỉ có quyền xem',
      permissions: getPermissionsByCode([
        PERMISSIONS.BOARD_VIEW,
        PERMISSIONS.CARD_VIEW,
        PERMISSIONS.COMMENT_CREATE,
        PERMISSIONS.COMMENT_EDIT_OWN,
        PERMISSIONS.COMMENT_DELETE_OWN,
      ]),
    },
  ];

  for (const roleData of roles) {
    const role = roleRepository.create(roleData);
    await roleRepository.save(role);
  }

  console.log('Roles seeded successfully!');
}
