import { PostRepository, postRepository, PostFilterOptions } from '@/modules/posting/post.repository';
import { CreatePostDTO, UpdatePostDTO } from '@/modules/posting/post.schema';
import { AppError } from '@/utils/error.response';
import { Post } from '@/modules/posting/models/post.model';
import { Post_image } from '@/modules/posting/models/post_image.model';
import { post_type, process_status } from '@/constants/constants';
import { PaginationResult } from '@/utils/pagination';
import cloudinary, { uploadToCloudinary } from '@/configs/cloudinary';
import axios from 'axios';
import {
  aiAnalyzeRequestSchema,
  aiAnalyzeResponseSchema,
  AiAnalyzeCallbackDTO,
  aiEmbeddingRequestSchema,
  aiEmbeddingResponseSchema,
  AiEmbeddingCallbackDTO,
} from '@/modules/posting/webhook.schema';

export class PostService {
  private postRepo: PostRepository;

  constructor() {
    this.postRepo = postRepository;
  }

  // ==================== CRUD ====================

  /** Tạo bài viết mới + upload ảnh lên Cloudinary */
  async create(
    data: CreatePostDTO,
    files?: Express.Multer.File[]
  ): Promise<Post> {
    // Tạo bài viết
    const post = await this.postRepo.create(data);

    // Upload ảnh lên Cloudinary nếu có
    if (files && files.length > 0) {
      const uploadedImageUrls = await this.uploadImages(files);
      await this.postRepo.addImages(post.id, uploadedImageUrls);
    }

    // Trả về bài viết đầy đủ (kèm ảnh + user)
    const fullPost = await this.postRepo.findById(post.id);
    if (!fullPost) {
      throw new AppError(500, 'Lỗi khi tạo bài viết');
    }

    await this.dispatchAnalyzeRequest(fullPost);

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



  /**
   * Lấy bài crawled active mới hơn cursor.
   * Client gửi cursor (ISO string). Lần đầu gửi "1970-01-01T00:00:00.000Z".
   * Trả về danh sách posts + nextCursor (để lưu lại cho lần gọi sau).
   */
  async getNewCrawledPosts(
    cursor: string,
    limit: number = 100
  ): Promise<{ posts: Post[]; nextCursor: string }> {
    const cursorDate = new Date(cursor);
    if (isNaN(cursorDate.getTime())) {
      throw new AppError(400, 'cursor không phải là ISO date hợp lệ');
    }

    const posts = await this.postRepo.findNewCrawledPosts(cursorDate, limit);

    // nextCursor = updatedAt của bài cuối cùng, hoặc giữ nguyên nếu không có bài mới
    const nextCursor =
      posts.length > 0
        ? posts[posts.length - 1].updatedAt.toISOString()
        : cursor;

    return { posts, nextCursor };
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

  /** Xử lý callback phân tích từ AI service */
  async handleAiCallback(
    data: AiAnalyzeCallbackDTO
  ): Promise<{ retried: boolean; forwardedEmbedding: boolean; post: Post | null }> {
    const post = await this.postRepo.findById(data.post_id);
    if (!post) {
      throw new AppError(404, 'Bài viết không tồn tại');
    }

    if (data.process_status === 'FAILED') {
      await this.dispatchAnalyzeRequest(post, true);
      const latestPost = await this.postRepo.findById(post.id);
      return { retried: true, forwardedEmbedding: false, post: latestPost };
    }

    if (!data.status) {
      throw new AppError(400, 'Thiếu status khi process_status = SUCCESS');
    }

    const updatedPost = await this.postRepo.updateTypeAndStatus(post.id, {
      status: data.status,
      type: data.type,
    });

    if (!updatedPost) {
      throw new AppError(500, 'Lỗi khi cập nhật trạng thái bài viết từ callback AI');
    }

    if (data.status === process_status.embedding) {
      const latestPost = await this.postRepo.findById(post.id);
      if (!latestPost) {
        throw new AppError(500, 'Không thể tải lại bài viết để gửi embedding request');
      }

      await this.dispatchEmbeddingRequest(latestPost);
      const postAfterDispatch = await this.postRepo.findById(post.id);

      return { retried: false, forwardedEmbedding: true, post: postAfterDispatch };
    }

    return { retried: false, forwardedEmbedding: false, post: updatedPost };
  }

  /** Xử lý callback embedding từ AI service */
  async handleEmbeddingCallback(data: AiEmbeddingCallbackDTO): Promise<{ retried: boolean; post: Post | null }> {
    const post = await this.postRepo.findById(data.post_id);
    if (!post) {
      throw new AppError(404, 'Bài viết không tồn tại');
    }

    if (data.process_status === 'FAILED') {
      await this.dispatchEmbeddingRequest(post, true);
      const latestPost = await this.postRepo.findById(post.id);
      return { retried: true, post: latestPost };
    }

    if (!data.status || !data.image_feature) {
      throw new AppError(400, 'Thiếu status hoặc image_feature khi process_status = SUCCESS');
    }

    const updatedPost = await this.postRepo.updateEmbeddingResult(post.id, {
      status: data.status,
      extractedInfo: data.extracted_info,
      itemTypeEmbedding: data.item_type_embedding,
      imageFeature: {
        postImagesId: data.image_feature.post_images_id,
        imageUrls: data.image_feature.image_urls,
        extractedFeatures: data.image_feature.extracted_features,
      },
    });

    if (!updatedPost) {
      throw new AppError(500, 'Lỗi khi cập nhật dữ liệu embedding từ callback AI');
    }

    return { retried: false, post: updatedPost };
  }

  // ==================== IMAGES ====================

  /** Thêm ảnh vào bài viết đã tồn tại */
  async addImages(
    postId: string,
    userId: string,
    files: Express.Multer.File[]
  ): Promise<Post_image[]> {
    const isOwner = await this.postRepo.isOwner(postId, userId);
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền thêm ảnh vào bài viết này');
    }

    // Kiểm tra số lượng ảnh hiện tại
    const existingImages = await this.postRepo.getImages(postId);
    const existingImageCount = existingImages.reduce(
      (count, image) => count + (Array.isArray(image.url) ? image.url.length : 0),
      0
    );

    if (existingImageCount + files.length > 5) {
      throw new AppError(400, `Bài viết chỉ được tối đa 5 ảnh. Hiện tại đã có ${existingImageCount} ảnh.`);
    }

    const uploadedImageUrls = await this.uploadImages(files);
    return this.postRepo.addImages(postId, uploadedImageUrls);
  }

  /** Xoá 1 ảnh khỏi bài viết */
  async removeImage(postId: string, imageId: string, userId: string): Promise<void> {
    const isOwner = await this.postRepo.isOwner(postId, userId);
    if (!isOwner) {
      throw new AppError(403, 'Bạn không có quyền xoá ảnh của bài viết này');
    }

    const deleted = await this.postRepo.removeImage(postId, imageId);
    if (!deleted) {
      throw new AppError(404, 'Ảnh không tồn tại');
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /** Upload ảnh từ buffer lên Cloudinary và trả về URL */
  private async uploadImages(
    files: Express.Multer.File[]
  ): Promise<string[]> {
    const uploadPromises = files.map(async (file) => {
      try {
        const result = await uploadToCloudinary(file.buffer);
        return result.secure_url;
      } catch (error) {
        throw new AppError(500, `Lỗi khi upload ảnh: ${file.originalname}`);
      }
    });

    return Promise.all(uploadPromises);
  }

  /** Xoá ảnh trên Cloudinary */
  private async deleteCloudinaryImages(images: Post_image[]): Promise<void> {
    const urls = images.flatMap((image) => (Array.isArray(image.url) ? image.url : []));
    const deletePromises = urls.map(async (url) => {
      try {
        // Trích xuất public_id từ URL Cloudinary
        const urlParts = url.split('/');
        const folderAndFile = urlParts.slice(-3).join('/'); // bk_campus/posts/filename
        const publicId = folderAndFile.replace(/\.[^/.]+$/, ''); // Bỏ extension

        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error(`Lỗi khi xoá ảnh Cloudinary: ${url}`, error);
      }
    });

    await Promise.all(deletePromises);
  }

  private getPostImageContext(post: Post): { postImagesId: string; imageUrls: string[] } | null {
    const firstImageRow = post.images?.find((img) => Array.isArray(img.url) && img.url.length > 0);
    if (!firstImageRow) {
      return null;
    }

    return {
      postImagesId: firstImageRow.id,
      imageUrls: firstImageRow.url,
    };
  }

  /** Gửi request sang AI service để phân tích bài viết */
  private async dispatchAnalyzeRequest(post: Post, isRetry: boolean = false): Promise<void> {
    const analyzeUrl = process.env.AI_SERVICE_ANALYZE_URL;
    if (!analyzeUrl) {
      throw new AppError(500, 'AI_SERVICE_ANALYZE_URL chưa được cấu hình');
    }

    const explicitCallbackUrl = process.env.AI_WEBHOOK_CALLBACK_URL;
    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL;
    const callbackUrl = explicitCallbackUrl ?? (backendPublicUrl ? `${backendPublicUrl.replace(/\/$/, '')}/api/webhook/ai/analyze-callback` : null);

    if (!callbackUrl) {
      throw new AppError(500, 'BACKEND_PUBLIC_URL hoặc AI_WEBHOOK_CALLBACK_URL chưa được cấu hình');
    }

    const imageContext = this.getPostImageContext(post);

    const payload = aiAnalyzeRequestSchema.parse({
      post_id: post.id,
      post_images_id: imageContext?.postImagesId ?? null,
      content: post.content,
      type: post.type,
      image_urls: imageContext?.imageUrls ?? [],
      callback_url: callbackUrl,
    });

    const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS || 15000);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const aiAuthToken = process.env.AI_SERVICE_AUTH_TOKEN;
    if (aiAuthToken) {
      headers.Authorization = `Bearer ${aiAuthToken}`;
    }

    try {
      const response = await axios.post(analyzeUrl, payload, {
        headers,
        timeout: timeoutMs,
      });

      aiAnalyzeResponseSchema.parse(response.data);
      await this.postRepo.updateStatus(post.id, process_status.moderating);
    } catch (error) {
      const action = isRetry ? 'retry' : 'request';
      throw new AppError(502, `Không thể gửi ${action} tới AI service`);
    }
  }

  /** Gửi request sang AI embedding service */
  private async dispatchEmbeddingRequest(post: Post, isRetry: boolean = false): Promise<void> {
    const embeddingUrl = process.env.AI_WEBHOOK_EMBEDDING_CALLBACK_URL;
    if (!embeddingUrl) {
      throw new AppError(500, 'AI_WEBHOOK_EMBEDDING_CALLBACK_URL chưa được cấu hình');
    }

    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL;
    if (!backendPublicUrl) {
      throw new AppError(500, 'BACKEND_PUBLIC_URL chưa được cấu hình');
    }

    const callbackUrl = `${backendPublicUrl.replace(/\/$/, '')}/api/webhook/ai/embedding-callback`;
    const imageContext = this.getPostImageContext(post);
    if (!imageContext) {
      throw new AppError(400, 'Không có ảnh hợp lệ để gửi embedding request');
    }

    const payload = aiEmbeddingRequestSchema.parse({
      post_id: post.id,
      post_images_id: imageContext.postImagesId,
      content: post.content,
      image_urls: imageContext.imageUrls,
      callback_url: callbackUrl,
    });

    const timeoutMs = Number(process.env.AI_SERVICE_TIMEOUT_MS || 15000);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const aiAuthToken = process.env.AI_SERVICE_AUTH_TOKEN;
    if (aiAuthToken) {
      headers.Authorization = `Bearer ${aiAuthToken}`;
    }

    try {
      const response = await axios.post(embeddingUrl, payload, {
        headers,
        timeout: timeoutMs,
      });

      aiEmbeddingResponseSchema.parse(response.data);
      await this.postRepo.updateStatus(post.id, process_status.embedding);
    } catch (error) {
      const action = isRetry ? 'retry' : 'request';
      throw new AppError(502, `Không thể gửi ${action} tới AI embedding service`);
    }
  }
}

// Export singleton instance
export const postService = new PostService();
