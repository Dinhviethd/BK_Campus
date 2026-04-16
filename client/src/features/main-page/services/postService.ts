import api from '@/lib/api';
import type {
  Post,
  PostFilters,
  PaginationResult,
  ApiResponse,
} from '../types';

interface MatchingRequestPayload {
  lost_post_id: string;
}

export interface MatchingRequestResponse {
  request_id: string;
  lost_post_id: string;
  user_id: string;
  status: string;
  created_at: string;
  message: string;
}

export interface MatchingScanStateResponse {
  is_scanning: boolean;
  request_id: string | null;
  lost_post_id: string | null;
  status: string | null;
}

export interface PostRealtimeEvent {
  postId: string;
  channel: string;
  eventType: string;
  occurredAt: string;
  post: Post;
}

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



/** Lấy chi tiết bài viết */
export const getPostById = async (id: string) => {
  const { data } = await api.get<ApiResponse<Post>>(`/posts/${id}`);
  return data.data!;
};

/** Lấy tất cả bài viết của 1 user */
export const getPostsByUser = async (userId: string, page: number = 1, limit: number = 20) => {
  const { data } = await api.get<ApiResponse<PaginationResult<Post>>>(`/posts/user/${userId}`, {
    params: { page, limit },
  });
  return data.data!;
};

export const getMyPosts = async (page: number = 1, limit: number = 20) => {
  const { data } = await api.get<ApiResponse<PaginationResult<Post>>>('/posts/me/posts', {
    params: { page, limit },
  });
  return data.data!;
};


export interface CreatePostPayload {
  content: string;
  location: string;
  type: string;
  source: string;
  fbLink?: string;
  images?: File[];
}

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


export const updatePostStatus = async (id: string, status: string) => {
  const { data } = await api.patch<ApiResponse<Post>>(`/posts/${id}/status`, { status });
  return data.data!;
};

export const deletePost = async (id: string) => {
  await api.delete(`/posts/${id}`);
};

export const triggerAiMatching = async (lostPostId: string) => {
  const payload: MatchingRequestPayload = {
    lost_post_id: lostPostId,
  };

  const { data } = await api.post<ApiResponse<MatchingRequestResponse>>('/matching/match-requests', payload);
  return data.data!;
};

export const getMatchingScanState = async () => {
  const { data } = await api.get<ApiResponse<MatchingScanStateResponse>>('/matching/match-requests/scan-state');
  return data.data!;
};

export const createPostRealtimeEventSource = (postId?: string) => {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').trim().replace(/\/$/, '');
  const streamPath = `${apiBaseUrl}/realtime/posts/stream`;
  const streamUrl = new URL(streamPath, window.location.origin);

  if (postId) {
    streamUrl.searchParams.set('postId', postId);
  }

  return new EventSource(streamUrl.toString(), {
    withCredentials: true,
  });
};
