import { post_source, post_type, process_status } from '@/constants/constants';
export interface CreatePostDTO {
  content: string;
  location: string;
  type: post_type;
  source: post_source;
  originalLink: string;
  userId: string;
}

export interface UpdatePostDTO {
  content?: string;
  location?: string;
  type?: post_type;
  status?: process_status;
}