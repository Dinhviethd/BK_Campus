"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePostSchema = exports.createPostSchema = exports.postSchema = void 0;
const zod_1 = require("zod");
const constants_1 = require("../../constants/constants");
exports.postSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Nội dung bài viết không được để trống'),
    location: zod_1.z.string().min(1, 'Vui lòng chọn địa điểm mất/nhặt'),
    type: zod_1.z.enum(constants_1.post_type, 'Loại bài viết phải là "lost" hoặc "found"'),
    source: zod_1.z.enum(constants_1.post_source, 'Nguồn bài viết phải là "web" hoặc "facebook"'),
    fbLink: zod_1.z.string().url('Link Facebook không hợp lệ').optional(),
    images: zod_1.z.array(zod_1.z.string()).optional(),
    status: zod_1.z.enum(constants_1.process_status, 'Trạng thái bài viết không hợp lệ').optional()
});
exports.createPostSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Nội dung bài viết không được để trống'),
    location: zod_1.z.string().min(1, 'Vui lòng chọn địa điểm mất/nhặt'),
    type: zod_1.z.enum(constants_1.post_type, 'Loại bài viết phải là "lost" hoặc "found"'),
    source: zod_1.z.enum(constants_1.post_source, 'Nguồn bài viết phải là "web" hoặc "facebook"'),
    originalLink: zod_1.z.string().default(''),
    userId: zod_1.z.string().uuid('ID người dùng không hợp lệ'),
});
exports.updatePostSchema = zod_1.z.object({
    content: zod_1.z.string().min(1, 'Nội dung bài viết không được để trống').optional(),
    location: zod_1.z.string().min(1, 'Vui lòng chọn địa điểm mất/nhặt').optional(),
    type: zod_1.z.enum(constants_1.post_type, 'Loại bài viết phải là "lost" hoặc "found"').optional(),
    status: zod_1.z.enum(constants_1.process_status, 'Trạng thái bài viết không hợp lệ').optional(),
}).strict();
