"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRepository = exports.PostRepository = void 0;
const database_config_1 = require("../../configs/database.config");
const post_model_1 = require("../../modules/posting/models/post.model");
const post_image_model_1 = require("../../modules/posting/models/post_image.model");
const constants_1 = require("../../constants/constants");
const pagination_1 = require("../../utils/pagination");
class PostRepository {
    repository;
    imageRepository;
    constructor() {
        this.repository = database_config_1.AppDataSource.getRepository(post_model_1.Post);
        this.imageRepository = database_config_1.AppDataSource.getRepository(post_image_model_1.Post_image);
    }
    /** Tạo bài viết mới */
    async create(data) {
        const post = this.repository.create({
            content: data.content,
            location: data.location,
            type: data.type,
            source: data.source,
            originalLink: data.originalLink,
            status: constants_1.process_status.ingested,
            user: { idUser: data.userId },
        });
        return this.repository.save(post);
    }
    /** Tìm bài viết theo ID (kèm ảnh + user) */
    async findById(id) {
        return this.repository.findOne({
            where: { id },
            relations: ['images', 'user'],
        });
    }
    /** Cập nhật bài viết */
    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }
    /** Xoá bài viết (cascade xoá ảnh) */
    async delete(id) {
        // Xoá ảnh trước
        await this.imageRepository.delete({ post: { id } });
        const result = await this.repository.delete(id);
        return result.affected !== 0;
    }
    // ==================== QUERIES ====================
    /** Lấy danh sách bài viết (có phân trang + lọc) */
    async findAll(page = 1, limit = 20, filters) {
        const query = this.repository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.images', 'images')
            .leftJoinAndSelect('post.user', 'user')
            .select([
            'post',
            'images.id',
            'images.url',
            'user.idUser',
            'user.name',
            'user.avatarUrl',
        ]);
        // Áp dụng filter
        if (filters?.type) {
            query.andWhere('post.type = :type', { type: filters.type });
        }
        if (filters?.status) {
            query.andWhere('post.status = :status', { status: filters.status });
        }
        if (filters?.source) {
            query.andWhere('post.source = :source', { source: filters.source });
        }
        if (filters?.location) {
            query.andWhere('post.location = :location', { location: filters.location });
        }
        if (filters?.userId) {
            query.andWhere('user.idUser = :userId', { userId: filters.userId });
        }
        if (filters?.search) {
            query.andWhere('post.content ILIKE :search', { search: `%${filters.search}%` });
        }
        // Sắp xếp mới nhất trước
        query.orderBy('post.createdAt', 'DESC');
        // Phân trang
        const { skip, take } = (0, pagination_1.createPaginationQuery)(page, limit);
        query.skip(skip).take(take);
        const [data, total] = await query.getManyAndCount();
        return pagination_1.PaginationUtil.createPagination(data, total, page, limit);
    }
    /** Lấy bài viết của 1 user (có phân trang) */
    async findByUserId(userId, page = 1, limit = 20) {
        return this.findAll(page, limit, { userId });
    }
    /** Lấy bài viết theo loại (lost / found) */
    async findByType(type, page = 1, limit = 20) {
        return this.findAll(page, limit, { type, status: constants_1.process_status.active });
    }
    // ==================== IMAGES ====================
    /** Thêm ảnh vào bài viết */
    async addImages(postId, imageUrls) {
        if (imageUrls.length === 0) {
            return [];
        }
        const postImage = this.imageRepository.create({
            url: imageUrls,
            post: { id: postId },
        });
        return [await this.imageRepository.save(postImage)];
    }
    /** Xoá 1 ảnh */
    async removeImage(postId, imageId) {
        const result = await this.imageRepository.delete({ id: imageId, post: { id: postId } });
        return result.affected !== 0;
    }
    /** Lấy danh sách ảnh của 1 bài viết */
    async getImages(postId) {
        return this.imageRepository.find({
            where: { post: { id: postId } },
        });
    }
    // ==================== STATUS ====================
    /** Cập nhật trạng thái bài viết */
    async updateStatus(id, status) {
        await this.repository.update(id, { status });
        return this.findById(id);
    }
    /** Cập nhật trạng thái + loại bài viết từ kết quả AI */
    async updateTypeAndStatus(id, payload) {
        await this.repository.update(id, {
            status: payload.status,
            ...(payload.type ? { type: payload.type } : {}),
        });
        return this.findById(id);
    }
    /** Cập nhật dữ liệu embedding cho post + post_image */
    async updateEmbeddingResult(id, payload) {
        await this.repository.update(id, {
            status: payload.status,
            ...(payload.extractedInfo !== undefined
                ? { extractedInfo: payload.extractedInfo }
                : {}),
            ...(payload.itemTypeEmbedding !== undefined
                ? { itemTypeEmbedding: payload.itemTypeEmbedding }
                : {}),
        });
        if (payload.imageFeature) {
            await this.imageRepository.update({ id: payload.imageFeature.postImagesId, post: { id } }, {
                url: payload.imageFeature.imageUrls,
                extractedFeatures: payload.imageFeature.extractedFeatures !== undefined
                    ? payload.imageFeature.extractedFeatures
                    : null,
            });
        }
        return this.findById(id);
    }
    /** Kiểm tra bài viết có tồn tại và thuộc về user không */
    async isOwner(postId, userId) {
        const post = await this.repository.findOne({
            where: { id: postId, user: { idUser: userId } },
        });
        return !!post;
    }
    /** Đếm bài viết theo trạng thái */
    async countByStatus(status) {
        return this.repository.count({ where: { status } });
    }
    // ==================== CRAWLED POSTS ====================
    /**
     * Lấy bài crawled active mới hơn cursor (updatedAt > cursor).
     * Điều kiện cố định: source=FACEBOOK_CRAWL, type=found, status=active.
     * Sắp xếp ASC theo updatedAt để trả kết quả theo thứ tự thời gian.
     * Sử dụng index IDX_posts_crawl_cursor.
     */
    async findNewCrawledPosts(cursor, limit = 100) {
        return this.repository
            .createQueryBuilder('post')
            .leftJoinAndSelect('post.images', 'images')
            .where('post.source = :source', { source: constants_1.post_source.facebook })
            .andWhere('post.status = :status', { status: constants_1.process_status.active })
            .andWhere('post.type = :type', { type: constants_1.post_type.found })
            .andWhere('post.updatedAt > :cursor', { cursor })
            .orderBy('post.updatedAt', 'ASC')
            .take(limit)
            .getMany();
    }
}
exports.PostRepository = PostRepository;
// Export singleton instance
exports.postRepository = new PostRepository();
