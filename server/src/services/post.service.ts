import { PostRepository, postRepository, PostFilterOptions } from '@/repositories/post.repository';
import { CreatePostDTO, UpdatePostDTO } from '@/DTOs/post.dto';
import { AppError } from '@/utils/error.response';
import { Post } from '@/models/post.model';
import { Post_image } from '@/models/post_image.model';
import { post_type, process_status } from '@/constants/constants';
import { PaginationResult } from '@/utils/pagination';
import cloudinary, { uploadToCloudinary } from '@/configs/cloudinary';

export class PostService {
  private postRepo: PostRepository;

  constructor() {
    this.postRepo = postRepository;
  }

  // ==================== CRUD ====================

  /** Tạo bài viết mới + upload ảnh lên Cloudinary */
  async create(
    data: CreatePostDTO,
    files?: Express.Multer.File[],
    nsfwResults?: { filename: string; score: number }[]
  ): Promise<Post> {
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
      throw new AppError(500, 'Lỗi khi tạo bài viết');
    }

    return fullPost;
  }

  /** Lấy chi tiết bài viết */
  async getById(id: string): Promise<Post> {
    const post = await this.postRepo.findById(id);
    if (!post) {
      throw new AppError(404, 'Bài viết không tồn tại');
    }
    return post;
  }

  /** Cập nhật bài viết (chỉ chủ sở hữu) */
  async update(postId: string, userId: string, data: UpdatePostDTO): Promise<Post> {
    // Kiểm tra bài viết tồn tại
    const post = await this.postRepo.findById(postId);
    if (!post) {
      throw new AppError(404, 'Bài viết không tồn tại');
    }

    // Kiểm tra quyền sở hữu
    const isOwner = await this.postRepo.isOwner(postId, userId);
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền chỉnh sửa bài viết này');
    }

    const updatedPost = await this.postRepo.update(postId, data);
    if (!updatedPost) {
      throw new AppError(500, 'Lỗi khi cập nhật bài viết');
    }

    return updatedPost;
  }

  /** Xoá bài viết (chỉ chủ sở hữu) */
  async delete(postId: string, userId: string): Promise<void> {
    // Kiểm tra bài viết tồn tại
    const post = await this.postRepo.findById(postId);
    if (!post) {
      throw new AppError(404, 'Bài viết không tồn tại');
    }

    // Kiểm tra quyền sở hữu
    const isOwner = await this.postRepo.isOwner(postId, userId);
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền xoá bài viết này');
    }

    // Xoá ảnh trên Cloudinary trước
    if (post.images && post.images.length > 0) {
      await this.deleteCloudinaryImages(post.images);
    }

    const deleted = await this.postRepo.delete(postId);
    if (!deleted) {
      throw new AppError(500, 'Lỗi khi xoá bài viết');
    }
  }

  // ==================== QUERIES ====================

  /** Lấy danh sách bài viết (có phân trang + lọc) */
  async getAll(
    page: number = 1,
    limit: number = 20,
    filters?: PostFilterOptions
  ): Promise<PaginationResult<Post>> {
    return this.postRepo.findAll(page, limit, filters);
  }

  /** Lấy bài viết của 1 user */
  async getByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginationResult<Post>> {
    return this.postRepo.findByUserId(userId, page, limit);
  }

  /** Lấy bài viết theo loại (lost / found) */
  async getByType(
    type: post_type,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginationResult<Post>> {
    return this.postRepo.findByType(type, page, limit);
  }

  // ==================== STATUS ====================

  /** Cập nhật trạng thái bài viết (chủ sở hữu: chỉ được đóng) */
  async updateStatus(
    postId: string,
    userId: string,
    status: process_status
  ): Promise<Post> {
    const post = await this.postRepo.findById(postId);
    if (!post) {
      throw new AppError(404, 'Bài viết không tồn tại');
    }

    const isOwner = await this.postRepo.isOwner(postId, userId);
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền thay đổi trạng thái bài viết này');
    }

    // User chỉ được đóng bài viết của mình
    if (status !== process_status.closed) {
      throw new AppError(400, 'Bạn chỉ có thể đóng bài viết');
    }

    const updatedPost = await this.postRepo.updateStatus(postId, status);
    if (!updatedPost) {
      throw new AppError(500, 'Lỗi khi cập nhật trạng thái');
    }

    return updatedPost;
  }

  // ==================== IMAGES ====================

  /** Thêm ảnh vào bài viết đã tồn tại */
  async addImages(
    postId: string,
    userId: string,
    files: Express.Multer.File[],
    nsfwResults?: { filename: string; score: number }[]
  ): Promise<Post_image[]> {
    const isOwner = await this.postRepo.isOwner(postId, userId);
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền thêm ảnh vào bài viết này');
    }

    // Kiểm tra số lượng ảnh hiện tại
    const existingImages = await this.postRepo.getImages(postId);
    if (existingImages.length + files.length > 5) {
      throw new AppError(400, `Bài viết chỉ được tối đa 5 ảnh. Hiện tại đã có ${existingImages.length} ảnh.`);
    }

    const uploadedImages = await this.uploadImages(files, nsfwResults);
    return this.postRepo.addImages(postId, uploadedImages);
  }

  /** Xoá 1 ảnh khỏi bài viết */
  async removeImage(postId: string, imageId: string, userId: string): Promise<void> {
    const isOwner = await this.postRepo.isOwner(postId, userId);
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền xoá ảnh của bài viết này');
    }

    const deleted = await this.postRepo.removeImage(imageId);
    if (!deleted) {
      throw new AppError(404, 'Ảnh không tồn tại');
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /** Upload ảnh từ buffer lên Cloudinary và trả về URL + nsfwScore */
  private async uploadImages(
    files: Express.Multer.File[],
    nsfwResults?: { filename: string; score: number }[]
  ): Promise<{ url: string; nsfwScore?: number }[]> {
    const uploadPromises = files.map(async (file) => {
      try {
        const result = await uploadToCloudinary(file.buffer);

        // Tìm nsfw score tương ứng (match theo originalname vì memoryStorage không có filename)
        const nsfwResult = nsfwResults?.find((r) => r.filename === file.originalname);

        return {
          url: result.secure_url,
          nsfwScore: nsfwResult?.score,
        };
      } catch (error) {
        throw new AppError(500, `Lỗi khi upload ảnh: ${file.originalname}`);
      }
    });

    return Promise.all(uploadPromises);
  }

  /** Xoá ảnh trên Cloudinary */
  private async deleteCloudinaryImages(images: Post_image[]): Promise<void> {
    const deletePromises = images.map(async (image) => {
      try {
        // Trích xuất public_id từ URL Cloudinary
        const urlParts = image.url.split('/');
        const folderAndFile = urlParts.slice(-3).join('/'); // bk_campus/posts/filename
        const publicId = folderAndFile.replace(/\.[^/.]+$/, ''); // Bỏ extension

        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error(`Lỗi khi xoá ảnh Cloudinary: ${image.url}`, error);
      }
    });

    await Promise.all(deletePromises);
  }
}

// Export singleton instance
export const postService = new PostService();
