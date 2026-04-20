import { Router } from 'express';
import { postController } from '@/modules/posting/controllers/post.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { uploadPostImages } from '@/configs/cloudinary';

const router = Router();

// ==================== PUBLIC ROUTES ====================

// Lấy danh sách bài viết (có phân trang + lọc)
router.get('/', postController.getAll);

// Lấy bài viết theo loại (lost / found)
router.get('/type/:type', postController.getByType);


// Lấy bài crawled mới (cursor-based, incremental)
router.get('/crawled/new', postController.getNewCrawledPosts);

// Lấy chi tiết bài viết
router.get('/:id', postController.getById);

// Lấy bài viết của 1 user
router.get('/user/:userId', postController.getByUserId);


// Lấy bài viết của user đang đăng nhập
router.get('/me/posts', authMiddleware, postController.getMyPosts);

// Tạo bài viết mới (có upload ảnh)
router.post(
  '/',
  authMiddleware,
  uploadPostImages.array('images', 5),
  postController.create
);

// Cập nhật bài viết
router.put('/:id', authMiddleware, postController.update);

// Xoá bài viết
router.delete('/:id', authMiddleware, postController.delete);

// Cập nhật trạng thái bài viết (đóng bài)
router.patch('/:id/status', authMiddleware, postController.updateStatus);

// Thêm ảnh vào bài viết
router.post(
  '/:id/images',
  authMiddleware,
  uploadPostImages.array('images', 5),
  postController.addImages
);

// Xoá 1 ảnh khỏi bài viết
router.delete('/:id/images/:imageId', authMiddleware, postController.removeImage);

export default router;