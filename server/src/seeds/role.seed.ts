import { AppDataSource } from '@/configs/database.config';
import { Permission } from '@/models/permission.model'; // Hãy sửa đường dẫn đúng với cấu trúc folder của bạn
import { Role } from '@/models/role.model';
import { In } from 'typeorm';

// 1. Định nghĩa danh sách các Quyền (Permissions) dựa trên nghiệp vụ
const PERMISSIONS_DATA = [
  // --- Quản lý Bài viết (Mất đồ & Nhặt được) ---
  { code: 'POST_CREATE', description: 'Được phép đăng bài viết mới (Mất/Nhặt)' },
  { code: 'POST_READ', description: 'Xem danh sách và chi tiết bài viết' },
  { code: 'POST_UPDATE_OWN', description: 'Chỉnh sửa bài viết của chính mình' },
  { code: 'POST_DELETE_OWN', description: 'Xóa bài viết của chính mình' },
  
  // --- Quản lý Bình luận ---
  { code: 'COMMENT_CREATE', description: 'Bình luận vào bài viết' },
  { code: 'COMMENT_READ', description: 'Xem bình luận' },
  { code: 'COMMENT_DELETE_OWN', description: 'Xóa bình luận của chính mình' },

  // --- Chức năng "Chuông" (AI Matching) ---
  { code: 'MATCH_REQUEST', description: 'Kích hoạt chức năng chuông để AI so khớp' },
  // Lưu ý: Việc chặn đăng bài khi đang matching sẽ được xử lý ở logic code (Service), 
  // không phải ở database seed.

  // --- Quyền Admin (Quản trị viên) ---
  { code: 'USER_MANAGE', description: 'Quản lý người dùng (Ban/Unban)' },
  { code: 'CONTENT_DELETE_ANY', description: 'Xóa bất kỳ bài viết/bình luận nào vi phạm' },
  { code: 'DASHBOARD_ACCESS', description: 'Truy cập trang quản trị' },
];

// 2. Hàm Seed Permissions
export const seedPermissions = async () => {
  const permissionRepo = AppDataSource.getRepository(Permission);

  console.log('...Seeding Permissions');
  
  for (const p of PERMISSIONS_DATA) {
    // Kiểm tra xem permission đã tồn tại chưa bằng code
    const exists = await permissionRepo.findOneBy({ code: p.code });
    
    if (!exists) {
      const newPerm = permissionRepo.create(p);
      await permissionRepo.save(newPerm);
    }
  }
};

// 3. Hàm Seed Roles
export const seedRoles = async () => {
  const roleRepo = AppDataSource.getRepository(Role);
  const permissionRepo = AppDataSource.getRepository(Permission);

  console.log('...Seeding Roles');

  // Lấy tất cả permission vừa tạo từ DB ra để gán
  const allPermissions = await permissionRepo.find();

  // --- Định nghĩa Role: USER (Người dùng thường) ---
  // User có quyền đăng bài, bình luận và dùng chuông.
  // Không có quyền Admin.
  const userPermissions = allPermissions.filter(p => 
    [
      'POST_CREATE', 'POST_READ', 'POST_UPDATE_OWN', 'POST_DELETE_OWN',
      'COMMENT_CREATE', 'COMMENT_READ', 'COMMENT_DELETE_OWN',
      'MATCH_REQUEST'
    ].includes(p.code)
  );

  const userRole = await roleRepo.findOneBy({ name: 'USER' });
  if (!userRole) {
    await roleRepo.save(roleRepo.create({
      name: 'USER',
      description: 'Người dùng mặc định, có thể đăng tin và dùng AI matching',
      permissions: userPermissions
    }));
  } else {
    // Nếu role đã tồn tại, update lại permission mới nhất (đề phòng có thay đổi)
    userRole.permissions = userPermissions;
    await roleRepo.save(userRole);
  }

  // --- Định nghĩa Role: ADMIN (Quản trị viên) ---
  // Admin có TẤT CẢ quyền
  const adminRole = await roleRepo.findOneBy({ name: 'ADMIN' });
  if (!adminRole) {
    await roleRepo.save(roleRepo.create({
      name: 'ADMIN',
      description: 'Quản trị viên hệ thống, toàn quyền kiểm soát',
      permissions: allPermissions // Admin lấy hết quyền
    }));
  } else {
    adminRole.permissions = allPermissions;
    await roleRepo.save(adminRole);
  }
};