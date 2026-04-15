"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postService = exports.PostService = void 0;
const post_repository_1 = require("../../../modules/posting/post.repository");
const error_response_1 = require("../../../utils/error.response");
const constants_1 = require("../../../constants/constants");
const cloudinary_1 = __importStar(require("../../../configs/cloudinary"));
const axios_1 = __importDefault(require("axios"));
const webhook_schema_1 = require("../../../modules/posting/webhook.schema");
class PostService {
    postRepo;
    constructor() {
        this.postRepo = post_repository_1.postRepository;
    }
    // ==================== CRUD ====================
    /** Tạo bài viết mới + upload ảnh lên Cloudinary */
    async create(data, files, nsfwResults) {
        // Tạo bài viết
        const post = await this.postRepo.create(data);
        // Upload ảnh lên Cloudinary nếu có
        if (files && files.length > 0) {
            const uploadedImages = await this.uploadImages(files, nsfwResults);
            await this.postRepo.addImages(post.id, uploadedImages);
        }
        // Trả về bài viết đầy đủ (kèm ảnh + user)
        const fullPost = await this.postRepo.findById(post.id);
        if (!fullPost) {
            throw new error_response_1.AppError(500, 'Lỗi khi tạo bài viết');
        }
        await this.dispatchAnalyzeRequest(fullPost);
        return fullPost;
    }
    /** Lấy chi tiết bài viết */
    async getById(id) {
        const post = await this.postRepo.findById(id);
        if (!post) {
            throw new error_response_1.AppError(404, 'Bài viết không tồn tại');
        }
        return post;
    }
    /** Cập nhật bài viết (chỉ chủ sở hữu) */
    async update(postId, userId, data) {
        // Kiểm tra bài viết tồn tại
        const post = await this.postRepo.findById(postId);
        if (!post) {
            throw new error_response_1.AppError(404, 'Bài viết không tồn tại');
        }
        // Kiểm tra quyền sở hữu
        const isOwner = await this.postRepo.isOwner(postId, userId);
        if (!isOwner) {
            throw new error_response_1.AppError(403, 'Bạn không có quyền chỉnh sửa bài viết này');
        }
        const updatedPost = await this.postRepo.update(postId, data);
        if (!updatedPost) {
            throw new error_response_1.AppError(500, 'Lỗi khi cập nhật bài viết');
        }
        return updatedPost;
    }
    /** Xoá bài viết (chỉ chủ sở hữu) */
    async delete(postId, userId) {
        // Kiểm tra bài viết tồn tại
        const post = await this.postRepo.findById(postId);
        if (!post) {
            throw new error_response_1.AppError(404, 'Bài viết không tồn tại');
        }
        // Kiểm tra quyền sở hữu
        const isOwner = await this.postRepo.isOwner(postId, userId);
        if (!isOwner) {
            throw new error_response_1.AppError(403, 'Bạn không có quyền xoá bài viết này');
        }
        // Xoá ảnh trên Cloudinary trước
        if (post.images && post.images.length > 0) {
            await this.deleteCloudinaryImages(post.images);
        }
        const deleted = await this.postRepo.delete(postId);
        if (!deleted) {
            throw new error_response_1.AppError(500, 'Lỗi khi xoá bài viết');
        }
    }
    // ==================== QUERIES ====================
    /** Lấy danh sách bài viết (có phân trang + lọc) */
    async getAll(page = 1, limit = 20, filters) {
        return this.postRepo.findAll(page, limit, filters);
    }
    /** Lấy bài viết của 1 user */
    async getByUserId(userId, page = 1, limit = 20) {
        return this.postRepo.findByUserId(userId, page, limit);
    }
    /** Lấy bài viết theo loại (lost / found) */
    async getByType(type, page = 1, limit = 20) {
        return this.postRepo.findByType(type, page, limit);
    }
    /**
     * Lấy bài crawled active mới hơn cursor.
     * Client gửi cursor (ISO string). Lần đầu gửi "1970-01-01T00:00:00.000Z".
     * Trả về danh sách posts + nextCursor (để lưu lại cho lần gọi sau).
     */
    async getNewCrawledPosts(cursor, limit = 100) {
        const cursorDate = new Date(cursor);
        if (isNaN(cursorDate.getTime())) {
            throw new error_response_1.AppError(400, 'cursor không phải là ISO date hợp lệ');
        }
        const posts = await this.postRepo.findNewCrawledPosts(cursorDate, limit);
        // nextCursor = updatedAt của bài cuối cùng, hoặc giữ nguyên nếu không có bài mới
        const nextCursor = posts.length > 0
            ? posts[posts.length - 1].updatedAt.toISOString()
            : cursor;
        return { posts, nextCursor };
    }
    // ==================== STATUS ====================
    /** Cập nhật trạng thái bài viết (chủ sở hữu: chỉ được đóng) */
    async updateStatus(postId, userId, status) {
        const post = await this.postRepo.findById(postId);
        if (!post) {
            throw new error_response_1.AppError(404, 'Bài viết không tồn tại');
        }
        const isOwner = await this.postRepo.isOwner(postId, userId);
        if (!isOwner) {
            throw new error_response_1.AppError(403, 'Bạn không có quyền thay đổi trạng thái bài viết này');
        }
        // User chỉ được đóng bài viết của mình
        if (status !== constants_1.process_status.closed) {
            throw new error_response_1.AppError(400, 'Bạn chỉ có thể đóng bài viết');
        }
        const updatedPost = await this.postRepo.updateStatus(postId, status);
        if (!updatedPost) {
            throw new error_response_1.AppError(500, 'Lỗi khi cập nhật trạng thái');
        }
        return updatedPost;
    }
    /** Xử lý callback từ AI service */
    async handleAiCallback(data) {
        const post = await this.postRepo.findById(data.post_id);
        if (!post) {
            throw new error_response_1.AppError(404, 'Bài viết không tồn tại');
        }
        if (data.process_status === 'FAILED') {
            await this.dispatchAnalyzeRequest(post, true);
            const latestPost = await this.postRepo.findById(post.id);
            return { retried: true, post: latestPost };
        }
        if (!data.status) {
            throw new error_response_1.AppError(400, 'Thiếu status khi process_status = SUCCESS');
        }
        const updatedPost = await this.postRepo.updateTypeAndStatus(post.id, {
            status: data.status,
            type: data.type,
        });
        if (!updatedPost) {
            throw new error_response_1.AppError(500, 'Lỗi khi cập nhật trạng thái bài viết từ callback AI');
        }
        return { retried: false, post: updatedPost };
    }
    // ==================== IMAGES ====================
    /** Thêm ảnh vào bài viết đã tồn tại */
    async addImages(postId, userId, files, nsfwResults) {
        const isOwner = await this.postRepo.isOwner(postId, userId);
        if (!isOwner) {
            throw new error_response_1.AppError(403, 'Bạn không có quyền thêm ảnh vào bài viết này');
        }
        // Kiểm tra số lượng ảnh hiện tại
        const existingImages = await this.postRepo.getImages(postId);
        if (existingImages.length + files.length > 5) {
            throw new error_response_1.AppError(400, `Bài viết chỉ được tối đa 5 ảnh. Hiện tại đã có ${existingImages.length} ảnh.`);
        }
        const uploadedImages = await this.uploadImages(files, nsfwResults);
        return this.postRepo.addImages(postId, uploadedImages);
    }
    /** Xoá 1 ảnh khỏi bài viết */
    async removeImage(postId, imageId, userId) {
        const isOwner = await this.postRepo.isOwner(postId, userId);
        if (!isOwner) {
            throw new error_response_1.AppError(403, 'Bạn không có quyền xoá ảnh của bài viết này');
        }
        const deleted = await this.postRepo.removeImage(imageId);
        if (!deleted) {
            throw new error_response_1.AppError(404, 'Ảnh không tồn tại');
        }
    }
    // ==================== PRIVATE HELPERS ====================
    /** Upload ảnh từ buffer lên Cloudinary và trả về URL + nsfwScore */
    async uploadImages(files, nsfwResults) {
        const uploadPromises = files.map(async (file) => {
            try {
                const result = await (0, cloudinary_1.uploadToCloudinary)(file.buffer);
                // Tìm nsfw score tương ứng (match theo originalname vì memoryStorage không có filename)
                const nsfwResult = nsfwResults?.find((r) => r.filename === file.originalname);
                return {
                    url: result.secure_url,
                    nsfwScore: nsfwResult?.score,
                };
            }
            catch (error) {
                throw new error_response_1.AppError(500, `Lỗi khi upload ảnh: ${file.originalname}`);
            }
        });
        return Promise.all(uploadPromises);
    }
    /** Xoá ảnh trên Cloudinary */
    async deleteCloudinaryImages(images) {
        const deletePromises = images.map(async (image) => {
            try {
                // Trích xuất public_id từ URL Cloudinary
                const urlParts = image.url.split('/');
                const folderAndFile = urlParts.slice(-3).join('/'); // bk_campus/posts/filename
                const publicId = folderAndFile.replace(/\.[^/.]+$/, ''); // Bỏ extension
                await cloudinary_1.default.uploader.destroy(publicId);
            }
            catch (error) {
                console.error(`Lỗi khi xoá ảnh Cloudinary: ${image.url}`, error);
            }
        });
        await Promise.all(deletePromises);
    }
    /** Gửi request sang AI service để phân tích bài viết */
    async dispatchAnalyzeRequest(post, isRetry = false) {
        const analyzeUrl = process.env.AI_SERVICE_ANALYZE_URL;
        if (!analyzeUrl) {
            throw new error_response_1.AppError(500, 'AI_SERVICE_ANALYZE_URL chưa được cấu hình');
        }
        const explicitCallbackUrl = process.env.AI_WEBHOOK_CALLBACK_URL;
        const backendPublicUrl = process.env.BACKEND_PUBLIC_URL;
        const callbackUrl = explicitCallbackUrl ?? (backendPublicUrl ? `${backendPublicUrl.replace(/\/$/, '')}/api/webhook/ai/analyze-callback` : null);
        if (!callbackUrl) {
            throw new error_response_1.AppError(500, 'BACKEND_PUBLIC_URL hoặc AI_WEBHOOK_CALLBACK_URL chưa được cấu hình');
        }
        const payload = webhook_schema_1.aiAnalyzeRequestSchema.parse({
            post_id: post.id,
            content: post.content,
            type: post.type,
            image_urls: post.images?.map((img) => img.url) ?? [],
            callback_url: callbackUrl,
        });
        const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS || 15000);
        const headers = {
            'Content-Type': 'application/json',
        };
        const aiAuthToken = process.env.AI_SERVICE_AUTH_TOKEN;
        if (aiAuthToken) {
            headers.Authorization = `Bearer ${aiAuthToken}`;
        }
        try {
            const response = await axios_1.default.post(analyzeUrl, payload, {
                headers,
                timeout: timeoutMs,
            });
            webhook_schema_1.aiAnalyzeResponseSchema.parse(response.data);
            await this.postRepo.updateStatus(post.id, constants_1.process_status.moderating);
        }
        catch (error) {
            const action = isRetry ? 'retry' : 'request';
            throw new error_response_1.AppError(502, `Không thể gửi ${action} tới AI service`);
        }
    }
}
exports.PostService = PostService;
// Export singleton instance
exports.postService = new PostService();
