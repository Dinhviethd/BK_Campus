"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postController = void 0;
const post_service_1 = require("../../../modules/posting/services/post.service");
const post_schema_1 = require("../../../modules/posting/post.schema");
const error_response_1 = require("../../../utils/error.response");
const constants_1 = require("../../../constants/constants");
class PostController {
    // ==================== CRUD ====================
    /** Tạo bài viết mới */
    create = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (!userId)
            throw new error_response_1.AppError(401, 'Unauthorized');
        // Validate input
        const validationResult = post_schema_1.postSchema.safeParse(req.body);
        if (!validationResult.success) {
            const errorMessage = validationResult.error.issues
                .map((err) => err.message)
                .join(', ');
            throw new error_response_1.AppError(400, errorMessage);
        }
        const { content, location, type, source, fbLink } = validationResult.data;
        const createData = {
            content,
            location,
            type,
            source: source,
            originalLink: fbLink || '',
            userId,
        };
        const files = req.files;
        const nsfwResults = req.nsfwResults;
        const post = await post_service_1.postService.create(createData, files, nsfwResults);
        const response = {
            success: true,
            message: 'Tạo bài viết thành công',
            data: post,
        };
        res.status(201).json(response);
    });
    /** Lấy chi tiết bài viết */
    getById = (0, error_response_1.asyncHandler)(async (req, res) => {
        const { id } = req.params;
        const post = await post_service_1.postService.getById(id);
        const response = {
            success: true,
            message: 'Lấy bài viết thành công',
            data: post,
        };
        res.status(200).json(response);
    });
    /** Cập nhật bài viết */
    update = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (!userId)
            throw new error_response_1.AppError(401, 'Unauthorized');
        const { id } = req.params;
        const updateData = req.body;
        const post = await post_service_1.postService.update(id, userId, updateData);
        const response = {
            success: true,
            message: 'Cập nhật bài viết thành công',
            data: post,
        };
        res.status(200).json(response);
    });
    /** Xoá bài viết */
    delete = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (!userId)
            throw new error_response_1.AppError(401, 'Unauthorized');
        const { id } = req.params;
        await post_service_1.postService.delete(id, userId);
        const response = {
            success: true,
            message: 'Xoá bài viết thành công',
        };
        res.status(200).json(response);
    });
    // ==================== QUERIES ====================
    /** Lấy danh sách bài viết (phân trang + lọc) */
    getAll = (0, error_response_1.asyncHandler)(async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const type = req.query.type;
        const status = req.query.status;
        const location = req.query.location;
        const search = req.query.search;
        const result = await post_service_1.postService.getAll(page, limit, {
            type,
            status,
            location,
            search,
        });
        const response = {
            success: true,
            message: 'Lấy danh sách bài viết thành công',
            data: result,
        };
        res.status(200).json(response);
    });
    /** Lấy bài viết của user đang đăng nhập */
    getMyPosts = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (!userId)
            throw new error_response_1.AppError(401, 'Unauthorized');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await post_service_1.postService.getByUserId(userId, page, limit);
        const response = {
            success: true,
            message: 'Lấy bài viết của bạn thành công',
            data: result,
        };
        res.status(200).json(response);
    });
    /** Lấy bài viết của 1 user theo userId */
    getByUserId = (0, error_response_1.asyncHandler)(async (req, res) => {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await post_service_1.postService.getByUserId(userId, page, limit);
        const response = {
            success: true,
            message: 'Lấy bài viết theo user thành công',
            data: result,
        };
        res.status(200).json(response);
    });
    /** Lấy bài viết theo loại (lost / found) */
    getByType = (0, error_response_1.asyncHandler)(async (req, res) => {
        const type = req.params.type;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        if (!Object.values(constants_1.post_type).includes(type)) {
            throw new error_response_1.AppError(400, 'Loại bài viết không hợp lệ. Phải là "lost" hoặc "found"');
        }
        const result = await post_service_1.postService.getByType(type, page, limit);
        const response = {
            success: true,
            message: `Lấy bài viết loại "${type}" thành công`,
            data: result,
        };
        res.status(200).json(response);
    });
    /**
     * Lấy bài crawled active mới (cursor-based, incremental).
     * Query: ?cursor=ISO_DATE&limit=100
     * Lần đầu: cursor=1970-01-01T00:00:00.000Z
     * Sau đó dùng nextCursor từ response trước.
     */
    getNewCrawledPosts = (0, error_response_1.asyncHandler)(async (req, res) => {
        const cursor = req.query.cursor || '1970-01-01T00:00:00.000Z';
        const limit = parseInt(req.query.limit) || 100;
        const result = await post_service_1.postService.getNewCrawledPosts(cursor, limit);
        const response = {
            success: true,
            message: `Lấy ${result.posts.length} bài crawled mới`,
            data: result,
        };
        res.status(200).json(response);
    });
    // ==================== STATUS ====================
    /** Cập nhật trạng thái bài viết (user đóng bài) */
    updateStatus = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (!userId)
            throw new error_response_1.AppError(401, 'Unauthorized');
        const { id } = req.params;
        const { status } = req.body;
        if (!status) {
            throw new error_response_1.AppError(400, 'Trạng thái không được để trống');
        }
        const post = await post_service_1.postService.updateStatus(id, userId, status);
        const response = {
            success: true,
            message: 'Cập nhật trạng thái thành công',
            data: post,
        };
        res.status(200).json(response);
    });
    // ==================== IMAGES ====================
    /** Thêm ảnh vào bài viết */
    addImages = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (!userId)
            throw new error_response_1.AppError(401, 'Unauthorized');
        const { id } = req.params;
        const files = req.files;
        const nsfwResults = req.nsfwResults;
        if (!files || files.length === 0) {
            throw new error_response_1.AppError(400, 'Vui lòng chọn ít nhất 1 ảnh');
        }
        const images = await post_service_1.postService.addImages(id, userId, files, nsfwResults);
        const response = {
            success: true,
            message: 'Thêm ảnh thành công',
            data: images,
        };
        res.status(201).json(response);
    });
    /** Xoá 1 ảnh khỏi bài viết */
    removeImage = (0, error_response_1.asyncHandler)(async (req, res) => {
        const userId = req.user?.userId;
        if (!userId)
            throw new error_response_1.AppError(401, 'Unauthorized');
        const { id, imageId } = req.params;
        await post_service_1.postService.removeImage(id, imageId, userId);
        const response = {
            success: true,
            message: 'Xoá ảnh thành công',
        };
        res.status(200).json(response);
    });
}
exports.postController = new PostController();
