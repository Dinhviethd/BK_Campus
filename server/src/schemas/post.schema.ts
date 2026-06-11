import { z } from 'zod';
import { post_source, post_type,  process_status  } from '../constants/constants';
export const postSchema = z.object({
    content: z.string().min(1, 'Nội dung bài viết không được để trống'),
    location: z.string().min(1, 'Vui lòng chọn địa điểm mất/nhặt'),
    type: z.enum(post_type, 'Loại bài viết phải là "lost" hoặc "found"'),
    source: z.enum(post_source, 'Nguồn bài viết phải là "web" hoặc "facebook"'),
    fbLink: z.string().url('Link Facebook không hợp lệ').optional(),
    images: z.array(z.string()).optional(), 
    status:  z.enum( process_status, 'Trạng thái bài viết không hợp lệ').optional()
});