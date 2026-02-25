import api from '@/lib/api';
import type {
  Post,
  PostFilters,
  PaginationResult,
  ApiResponse,
} from '../types';

// ==================== GET ====================

/** Lấy danh sách bài viết (phân trang + lọc) */
export const getPosts = async (filters?: PostFilters) => {
  const params: Record<string, string | number> = {};
  if (filters?.type) params.type = filters.type;
  if (filters?.status) params.status = filters.status;
  if (filters?.location) params.location = filters.location;
  if (filters?.search) params.search = filters.search;
  if (filters?.page) params.page = filters.page;
  if (filters?.limit) params.limit = filters.limit;

  const { data } = await api.get<ApiResponse<PaginationResult<Post>>>('/posts', { params });
  return data.data!;
};

/** Lấy bài crawled từ cache (RAM) — dùng cho trang chủ */
export const getCachedCrawledPosts = async (page = 1, limit = 20) => {
  const { data } = await api.get<ApiResponse<PaginationResult<Post>>>('/posts/crawled/cached', {
    params: { page, limit },
  });
  return data.data!;
};

/** Lấy chi tiết bài viết */
export const getPostById = async (id: string) => {
  const { data } = await api.get<ApiResponse<Post>>(`/posts/${id}`);
  return data.data!;
};

// ==================== CREATE ====================

export interface CreatePostPayload {
  content: string;
  location: string;
  type: string;
  source: string;
  fbLink?: string;
  images?: File[];
}

/** Tạo bài viết mới (multipart/form-data vì có ảnh) */
export const createPost = async (payload: CreatePostPayload) => {
  const formData = new FormData();
  formData.append('content', payload.content);
  formData.append('location', payload.location);
  formData.append('type', payload.type);
  formData.append('source', payload.source);
  if (payload.fbLink) formData.append('fbLink', payload.fbLink);
  if (payload.images) {
    payload.images.forEach((file) => formData.append('images', file));
  }

  const { data } = await api.post<ApiResponse<Post>>('/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data!;
};

// ==================== UPDATE / DELETE ====================

export const updatePostStatus = async (id: string, status: string) => {
  const { data } = await api.patch<ApiResponse<Post>>(`/posts/${id}/status`, { status });
  return data.data!;
};

export const deletePost = async (id: string) => {
  await api.delete(`/posts/${id}`);
};
