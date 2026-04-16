"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const post_controller_1 = require("../../../modules/posting/controllers/post.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const cloudinary_1 = require("../../../configs/cloudinary");
const router = (0, express_1.Router)();
// ==================== PUBLIC ROUTES ====================
// Lấy danh sách bài viết (có phân trang + lọc)
router.get('/', post_controller_1.postController.getAll);
// Lấy bài viết theo loại (lost / found)
router.get('/type/:type', post_controller_1.postController.getByType);
// Lấy bài crawled mới (cursor-based, incremental)
router.get('/crawled/new', post_controller_1.postController.getNewCrawledPosts);
// Lấy chi tiết bài viết
router.get('/:id', post_controller_1.postController.getById);
// Lấy bài viết của 1 user
router.get('/user/:userId', post_controller_1.postController.getByUserId);
// Lấy bài viết của user đang đăng nhập
router.get('/me/posts', auth_middleware_1.authMiddleware, post_controller_1.postController.getMyPosts);
// Tạo bài viết mới (có upload ảnh)
router.post('/', auth_middleware_1.authMiddleware, cloudinary_1.uploadPostImages.array('images', 5), post_controller_1.postController.create);
// Cập nhật bài viết
router.put('/:id', auth_middleware_1.authMiddleware, post_controller_1.postController.update);
// Xoá bài viết
router.delete('/:id', auth_middleware_1.authMiddleware, post_controller_1.postController.delete);
// Cập nhật trạng thái bài viết (đóng bài)
router.patch('/:id/status', auth_middleware_1.authMiddleware, post_controller_1.postController.updateStatus);
// Thêm ảnh vào bài viết
router.post('/:id/images', auth_middleware_1.authMiddleware, cloudinary_1.uploadPostImages.array('images', 5), post_controller_1.postController.addImages);
// Xoá 1 ảnh khỏi bài viết
router.delete('/:id/images/:imageId', auth_middleware_1.authMiddleware, post_controller_1.postController.removeImage);
exports.default = router;
