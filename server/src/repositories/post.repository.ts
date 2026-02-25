import { Repository } from 'typeorm';
import { AppDataSource } from '@/configs/database.config';
import { Post } from '@/models/post.model';
import { Post_image } from '@/models/post_image.model';
import { post_source, post_type, process_status } from '@/constants/constants';
import { PaginationResult, createPaginationQuery, PaginationUtil } from '@/utils/pagination';
import {UpdatePostDTO, CreatePostDTO } from '@/DTOs/post.dto'

export interface PostFilterOptions {
  type?: post_type;
  status?: process_status;
  source?: post_source;
  location?: string;
  userId?: string;
  search?: string;
}

export class PostRepository {
  private repository: Repository<Post>;
  private imageRepository: Repository<Post_image>;

  constructor() {
    this.repository = AppDataSource.getRepository(Post);
    this.imageRepository = AppDataSource.getRepository(Post_image);
  }

  /** Tạo bài viết mới */
  async create(data: CreatePostDTO): Promise<Post> {
    const post = this.repository.create({
      content: data.content,
      location: data.location,
      type: data.type,
      source: data.source,
      originalLink: data.originalLink,
      status: process_status.processing,
      user: { idUser: data.userId } as any,
    });
    return this.repository.save(post);
  }

  /** Tìm bài viết theo ID (kèm ảnh + user) */
  async findById(id: string): Promise<Post | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['images', 'user'],
    });
  }

  /** Cập nhật bài viết */
  async update(id: string, data: UpdatePostDTO): Promise<Post | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  /** Xoá bài viết (cascade xoá ảnh) */
  async delete(id: string): Promise<boolean> {
    // Xoá ảnh trước
    await this.imageRepository.delete({ post: { id } });
    const result = await this.repository.delete(id);
    return result.affected !== 0;
  }

  // ==================== QUERIES ====================

  /** Lấy danh sách bài viết (có phân trang + lọc) */
  async findAll(
    page: number = 1,
    limit: number = 20,
    filters?: PostFilterOptions
  ): Promise<PaginationResult<Post>> {
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
    const { skip, take } = createPaginationQuery(page, limit);
    query.skip(skip).take(take);

    const [data, total] = await query.getManyAndCount();
    return PaginationUtil.createPagination(data, total, page, limit);
  }

  /** Lấy bài viết của 1 user (có phân trang) */
  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginationResult<Post>> {
    return this.findAll(page, limit, { userId });
  }

  /** Lấy bài viết theo loại (lost / found) */
  async findByType(
    type: post_type,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginationResult<Post>> {
    return this.findAll(page, limit, { type, status: process_status.active });
  }

  // ==================== IMAGES ====================

  /** Thêm ảnh vào bài viết */
  async addImages(
    postId: string,
    images: { url: string; nsfwScore?: number }[]
  ): Promise<Post_image[]> {
    const postImages = images.map((img) =>
      this.imageRepository.create({
        url: img.url,
        nsfwScore: img.nsfwScore,
        post: { id: postId } as any,
      })
    );
    return this.imageRepository.save(postImages);
  }

  /** Xoá 1 ảnh */
  async removeImage(imageId: string): Promise<boolean> {
    const result = await this.imageRepository.delete(imageId);
    return result.affected !== 0;
  }

  /** Lấy danh sách ảnh của 1 bài viết */
  async getImages(postId: string): Promise<Post_image[]> {
    return this.imageRepository.find({
      where: { post: { id: postId } },
    });
  }

  // ==================== STATUS ====================

  /** Cập nhật trạng thái bài viết */
  async updateStatus(id: string, status: process_status): Promise<Post | null> {
    await this.repository.update(id, { status });
    return this.findById(id);
  }

  /** Kiểm tra bài viết có tồn tại và thuộc về user không */
  async isOwner(postId: string, userId: string): Promise<boolean> {
    const post = await this.repository.findOne({
      where: { id: postId, user: { idUser: userId } },
    });
    return !!post;
  }

  /** Đếm bài viết theo trạng thái */
  async countByStatus(status: process_status): Promise<number> {
    return this.repository.count({ where: { status } });
  }

  // ==================== CRAWLED POSTS ====================



  /**
   * Lấy bài crawled active mới hơn cursor (updatedAt > cursor).
   * Điều kiện cố định: source=FACEBOOK_CRAWL, type=found, status=active.
   * Sắp xếp ASC theo updatedAt để trả kết quả theo thứ tự thời gian.
   * Sử dụng index IDX_posts_crawl_cursor.
   */
  async findNewCrawledPosts(
    cursor: Date,
    limit: number = 100
  ): Promise<Post[]> {
    return this.repository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.images', 'images')
      .where('post.source = :source', { source: post_source.facebook })
      .andWhere('post.status = :status', { status: process_status.active })
      .andWhere('post.type = :type', { type: post_type.found })
      .andWhere('post.updatedAt > :cursor', { cursor })
      .orderBy('post.updatedAt', 'ASC')
      .take(limit)
      .getMany();
  }
}

// Export singleton instance
export const postRepository = new PostRepository();
