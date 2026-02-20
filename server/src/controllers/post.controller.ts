import { Request, Response } from 'express';
import { postService } from '@/services/post.service';
import { postSchema } from '@/schemas/post.schema';
import { asyncHandler, AppError } from '@/utils/error.response';
import { ApiResponseDTO } from '@/DTOs/auth.dto';
import { Post } from '@/models/post.model';
import { Post_image } from '@/models/post_image.model';
import { post_type, post_source, process_status } from '@/constants/constants';
import { PaginationResult } from '@/utils/pagination';

class PostController {
  // ==================== CRUD ====================

  /** Tạo bài viết mới */
  create = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    // Validate input
    const validationResult = postSchema.safeParse(req.body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.issues
        .map((err: any) => err.message)
        .join(', ');
      throw new AppError(400, errorMessage);
    }

    const { content, location, type, source, fbLink } = validationResult.data;

    const createData = {
      content,
      location,
      type,
      source: source as post_source,
      originalLink: fbLink || '',
      userId,
    };

    const files = req.files as Express.Multer.File[] | undefined;
    const nsfwResults = req.nsfwResults;

    const post = await postService.create(createData, files, nsfwResults);

    const response: ApiResponseDTO<Post> = {
      success: true,
      message: 'Tạo bài viết thành công',
      data: post,
    };

    res.status(201).json(response);
  });

  /** Lấy chi tiết bài viết */
  getById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const post = await postService.getById(id);

    const response: ApiResponseDTO<Post> = {
      success: true,
      message: 'Lấy bài viết thành công',
      data: post,
    };

    res.status(200).json(response);
  });

  /** Cập nhật bài viết */
  update = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const updateData = req.body;

    const post = await postService.update(id, userId, updateData);

    const response: ApiResponseDTO<Post> = {
      success: true,
      message: 'Cập nhật bài viết thành công',
      data: post,
    };

    res.status(200).json(response);
  });

  /** Xoá bài viết */
  delete = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;

    await postService.delete(id, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Xoá bài viết thành công',
    };

    res.status(200).json(response);
  });

  // ==================== QUERIES ====================

  /** Lấy danh sách bài viết (phân trang + lọc) */
  getAll = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as post_type | undefined;
    const status = req.query.status as process_status | undefined;
    const location = req.query.location as string | undefined;
    const search = req.query.search as string | undefined;

    const result = await postService.getAll(page, limit, {
      type,
      status,
      location,
      search,
    });

    const response: ApiResponseDTO<PaginationResult<Post>> = {
      success: true,
      message: 'Lấy danh sách bài viết thành công',
      data: result,
    };

    res.status(200).json(response);
  });

  /** Lấy bài viết của user đang đăng nhập */
  getMyPosts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await postService.getByUserId(userId, page, limit);

    const response: ApiResponseDTO<PaginationResult<Post>> = {
      success: true,
      message: 'Lấy bài viết của bạn thành công',
      data: result,
    };

    res.status(200).json(response);
  });

  /** Lấy bài viết của 1 user theo userId */
  getByUserId = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await postService.getByUserId(userId, page, limit);

    const response: ApiResponseDTO<PaginationResult<Post>> = {
      success: true,
      message: 'Lấy bài viết theo user thành công',
      data: result,
    };

    res.status(200).json(response);
  });

  /** Lấy bài viết theo loại (lost / found) */
  getByType = asyncHandler(async (req: Request, res: Response) => {
    const type = req.params.type as post_type;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!Object.values(post_type).includes(type)) {
      throw new AppError(400, 'Loại bài viết không hợp lệ. Phải là "lost" hoặc "found"');
    }

    const result = await postService.getByType(type, page, limit);

    const response: ApiResponseDTO<PaginationResult<Post>> = {
      success: true,
      message: `Lấy bài viết loại "${type}" thành công`,
      data: result,
    };

    res.status(200).json(response);
  });

  // ==================== STATUS ====================

  /** Cập nhật trạng thái bài viết (user đóng bài) */
  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new AppError(400, 'Trạng thái không được để trống');
    }

    const post = await postService.updateStatus(id, userId, status);

    const response: ApiResponseDTO<Post> = {
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: post,
    };

    res.status(200).json(response);
  });

  // ==================== IMAGES ====================

  /** Thêm ảnh vào bài viết */
  addImages = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id } = req.params;
    const files = req.files as Express.Multer.File[];
    const nsfwResults = req.nsfwResults;

    if (!files || files.length === 0) {
      throw new AppError(400, 'Vui lòng chọn ít nhất 1 ảnh');
    }

    const images = await postService.addImages(id, userId, files, nsfwResults);

    const response: ApiResponseDTO<Post_image[]> = {
      success: true,
      message: 'Thêm ảnh thành công',
      data: images,
    };

    res.status(201).json(response);
  });

  /** Xoá 1 ảnh khỏi bài viết */
  removeImage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const { id, imageId } = req.params;

    await postService.removeImage(id, imageId, userId);

    const response: ApiResponseDTO<null> = {
      success: true,
      message: 'Xoá ảnh thành công',
    };

    res.status(200).json(response);
  });
}

export const postController = new PostController();
