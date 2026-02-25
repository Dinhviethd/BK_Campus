// ==================== ENUMS (mirror backend — const objects for erasableSyntaxOnly) ====================

export const PostSource = {
  WEB_USER: 'WEB_USER',
  FACEBOOK_CRAWL: 'FACEBOOK_CRAWL',
} as const;
export type PostSource = (typeof PostSource)[keyof typeof PostSource];

export const PostType = {
  LOST: 'LOST',
  FOUND: 'FOUND',
} as const;
export type PostType = (typeof PostType)[keyof typeof PostType];

export const ProcessStatus = {
  PROCESSING: 'PROCESSING',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
  ACTIVE: 'ACTIVE',
} as const;
export type ProcessStatus = (typeof ProcessStatus)[keyof typeof ProcessStatus];

// ==================== ENTITIES ====================

export interface PostImage {
  id: string;
  url: string;
}

export interface PostUser {
  idUser: string;
  name: string;
  avatarUrl?: string;
}

/** Backend Post entity (GET /api/posts response) */
export interface Post {
  id: string;
  source: PostSource;
  originalLink: string;
  content: string;
  location: string;
  type: PostType;
  status: ProcessStatus;
  createdAt: string;
  updatedAt: string;
  user: PostUser;
  images: PostImage[];
}

// ==================== API RESPONSE ====================

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

// ==================== FILTERS ====================

export interface PostFilters {
  type?: PostType;
  status?: ProcessStatus;
  location?: string;
  search?: string;
  page?: number;
  limit?: number;
}
