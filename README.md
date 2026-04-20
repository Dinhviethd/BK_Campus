
# BK Campus Coding

Hệ thống web hỗ trợ đăng và theo dõi bài viết thất lạc / tìm thấy trong khuôn viên campus, có xác thực người dùng, quản lý bài viết, upload ảnh, xử lý AI để phân loại và trích xuất dữ liệu, đồng thời đẩy cập nhật realtime cho client.

## 1. Tổng quan sản phẩm
Hệ thống được triển khai theo microservice, tách service web và AI
Project được tổ chức theo mô hình monorepo với 2 phần chính:

- `client/`: giao diện người dùng bằng React + Vite.
- `server/`: API backend bằng Express + TypeORM + PostgreSQL.

Luồng nghiệp vụ trung tâm của hệ thống xoay quanh bài viết `LOST` và `FOUND`:

- Người dùng đăng ký, đăng nhập và khôi phục mật khẩu qua OTP.
- Người dùng tạo bài viết thất lạc / nhặt được đồ, kèm ảnh minh họa.
- Backend upload ảnh lên Cloudinary, lưu dữ liệu vào PostgreSQL.
- Backend gửi bài viết sang AI service để phân tích nội dung và ảnh.
- AI service trả callback về backend qua webhook.
- Backend cập nhật trạng thái bài viết, có thể chuyển tiếp sang bước embedding.
- Sự kiện realtime được phát về client qua SSE.

## 2. Use case chính

### 2.1. Xác thực

- Đăng ký tài khoản mới.
- Đăng nhập bằng email và mật khẩu.
- Lấy thông tin tài khoản hiện tại.
- Làm mới access token bằng refresh token.
- Đăng xuất.
- Gửi OTP quên mật khẩu qua email.
- Xác thực OTP.
- Đặt lại mật khẩu.

### 2.2. Quản lý bài viết

- Xem danh sách bài viết có phân trang.
- Lọc bài viết theo loại, trạng thái, vị trí, từ khóa.
- Xem bài viết theo `LOST` / `FOUND`.
- Xem chi tiết một bài viết.
- Xem bài viết của chính mình hoặc của một user khác.
- Tạo bài viết mới kèm tối đa 5 ảnh.
- Cập nhật bài viết.
- Xoá bài viết.
- Đóng bài viết của chính mình.
- Thêm / xoá ảnh trong bài viết.

### 2.3. AI và tự động hóa

- Gửi nội dung bài viết sang AI service để phân tích.
- Nhận callback kết quả phân tích từ AI service.
- Tự động chuyển sang bước embedding khi phân tích thành công.
- Nhận callback embedding từ AI service.
- Retry khi AI service báo lỗi `FAILED`.

### 2.4. Realtime và đồng bộ dữ liệu

- Client nghe stream SSE để nhận cập nhật bài viết mới hoặc thay đổi trạng thái.
- Tự làm mới feed khi có sự kiện realtime.
- Giảm độ trễ giữa thao tác trên server và dữ liệu hiển thị ở frontend.

### 2.5. Trải nghiệm giao diện

- Trang auth riêng biệt cho login / register / reset password.
- Trang chính có sidebar lọc, ô tạo bài viết, danh sách bài viết, sidebar thông tin.
- Infinite scroll để tải thêm bài viết.
- Debounce tìm kiếm để giảm số request.
- Protected route cho khu vực cần đăng nhập.

## 3. Kiến trúc tổng thể

### 3.1. Client

- React 19 + TypeScript + Vite.
- React Router dùng lazy loading cho route splitting.
- Zustand lưu trạng thái auth.
- Tailwind CSS cho style.
- Radix UI / shadcn style components cho UI primitives.
- Sonner cho toast notification.
- SSE để nhận sự kiện realtime từ backend.

### 3.2. Server
- Express 5 làm web server.
- TypeORM làm ORM.
- PostgreSQL làm database.
- Zod để validate input và webhook payload.
- JWT cho access token / refresh token.
- bcryptjs để hash mật khẩu.
- multer để nhận upload ảnh trong memory.
- Cloudinary để lưu ảnh.
- Socket.IO để hỗ trợ realtime socket layer.
- SSE endpoint để stream sự kiện bài viết.
- Redis dùng cho tầng cache / realtime / subscriber.
- Nodemailer để gửi OTP quên mật khẩu.
- Axios để gọi AI service bên ngoài.
- CORS + cookie-parser để xử lý xác thực xuyên origin.
## 4. Luồng API

### 4.1. Luồng xác thực

1. Client gửi request tới `/api/auth/register` hoặc `/api/auth/login`.
2. Controller validate body bằng Zod schema.
3. Service kiểm tra email, hash mật khẩu, tạo JWT.
4. Refresh token được set vào httpOnly cookie.
5. Client lưu user và access token vào Zustand store.
6. Các request cần bảo vệ sẽ gửi `Authorization: Bearer <accessToken>`.
7. `authMiddleware` xác thực JWT trước khi cho vào route bảo vệ.
8. `GET /api/auth/me` dùng để đồng bộ lại thông tin user khi cần.

### 4.2. Luồng tạo bài viết

1. Client gửi `POST /api/posts` kèm form data và ảnh.
2. `authMiddleware` xác thực user.
3. `multer` nhận file ảnh trong bộ nhớ.
4. Controller validate dữ liệu bằng Zod.
5. Service tạo post trong database.
6. Ảnh được upload lên Cloudinary.
7. Bài viết đầy đủ được load lại từ database.
8. Backend gửi request phân tích sang AI service.
9. Trạng thái bài viết được chuyển sang giai đoạn phù hợp.

### 4.3. Luồng AI callback

1. AI service gọi về `/api/webhook/ai/analyze-callback` hoặc `/api/webhook/ai/embedding-callback`.
2. Backend kiểm tra webhook secret nếu được cấu hình.
3. Body callback được validate bằng Zod.
4. Service cập nhật trạng thái / loại bài viết / embedding result.
5. Nếu AI trả `FAILED`, backend tự gửi lại request.
6. Nếu AI phân tích xong, backend có thể chuyển tiếp sang embedding.
7. Sự kiện được publish sang realtime layer.

### 4.4. Luồng realtime

1. Client mở kết nối SSE tới `/api/realtime/posts/stream`.
2. Server gửi event `connected` để xác nhận stream.
3. Khi có thay đổi bài viết, backend publish event nội bộ.
4. `post-realtime.subscriber` nhận event và đẩy qua SSE.
5. Client nhận event và refetch feed sau một khoảng debounce ngắn.

### 4.5. Luồng quên mật khẩu

1. Client gửi email tới `/api/auth/forgot-password`.
2. Backend sinh OTP và lưu vào user record với thời hạn hết hạn.
3. OTP được gửi qua email.
4. Client xác thực OTP qua `/api/auth/verify-otp`.
5. Client đặt lại mật khẩu qua `/api/auth/reset-password`.

## 5. API endpoints

### 5.1. Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/forgot-password`
- `POST /api/auth/verify-otp`
- `POST /api/auth/reset-password`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### 5.2. Posts

- `GET /api/posts`
- `GET /api/posts/type/:type`
- `GET /api/posts/crawled/new`
- `GET /api/posts/:id`
- `GET /api/posts/user/:userId`
- `GET /api/posts/me/posts`
- `POST /api/posts`
- `PUT /api/posts/:id`
- `DELETE /api/posts/:id`
- `PATCH /api/posts/:id/status`
- `POST /api/posts/:id/images`
- `DELETE /api/posts/:id/images/:imageId`

### 5.3. Webhook

- `POST /api/webhook/ai/analyze-callback`
- `POST /api/webhook/ai/embedding-callback`

### 5.4. Realtime

- `GET /api/realtime/posts/stream`

## 6. Design patterns và kiến trúc code

### 6.1. Layered Architecture

Project tách rõ các lớp:

- `route` để khai báo endpoint.
- `controller` để nhận request / response.
- `service` để chứa business logic.
- `repository` để truy cập database.
- `schema` để validate dữ liệu.

### 6.2. Controller-Service-Repository

Đây là pattern chính ở backend:

- Controller chỉ điều phối request và response.
- Service chứa logic nghiệp vụ như đăng ký, phân quyền, retry AI, upload ảnh.
- Repository thao tác trực tiếp với TypeORM / database.

### 6.3. Middleware Pattern

Các concern cross-cutting được tách ra thành middleware:

- Xác thực JWT.
- Validate request body.
- Xử lý lỗi tập trung.
- Kiểm tra trạng thái tài khoản nếu cần.

### 6.4. Singleton Service / Repository Instances

Nhiều service và repository được export dưới dạng instance dùng chung để tránh tạo lại nhiều lần.

### 6.5. DTO + Schema Validation

- Dữ liệu đầu vào được mô tả bằng Zod schema.
- API response được bọc bằng kiểu `ApiResponse`.
- Webhook payload cũng được validate trước khi xử lý.

### 6.6. Protected / Public Route Guard

Frontend chia route thành:

- `ProtectedRoute` cho khu vực cần đăng nhập.
- `PublicRoute` cho các màn auth.

### 6.7. Lazy Loading / Code Splitting

Routes và nhiều component được load lazy để giảm bundle ban đầu.

### 6.8. Event-Driven Flow

Luồng AI và realtime hoạt động theo mô hình event-driven:

- Request khởi tạo ở backend.
- AI xử lý async.
- Webhook callback trả kết quả.
- Realtime layer phát sự kiện sang client.

### 6.9. Persistence for Client State

Zustand + persist dùng để lưu trạng thái auth giữa các lần reload.

### 6.10. Graceful Shutdown

Server đóng kết nối database, Redis và Socket.IO an toàn khi nhận tín hiệu dừng.

## 7. Công nghệ sử dụng

### 7.1. Frontend

- React 19
- TypeScript
- Vite
- React Router DOM
- Zustand
- Tailwind CSS
- Radix UI
- Sonner
- Lucide React
- Embla Carousel
- Recharts
- motion
- Zod

### 7.2. Backend

- Node.js
- Express 5
- TypeScript
- TypeORM
- PostgreSQL
- JWT
- bcryptjs
- Zod
- Multer
- Cloudinary
- Socket.IO
- Redis / ioredis / Upstash Redis
- Nodemailer
- Axios
- dotenv
- cookie-parser
- cors
- sharp
- Firebase Admin
- TensorFlow.js / nsfwjs

### 7.3. DevOps / Deploy

- Docker multi-stage build
- Cloud Build
- Cloud Run

## 8. Luồng dữ liệu chính theo nghiệp vụ

### 8.1. Tạo bài viết

Client -> API -> validate -> lưu DB -> upload ảnh -> gọi AI -> cập nhật trạng thái -> publish realtime.

### 8.2. Xem feed

Client -> `GET /api/posts` hoặc `GET /api/posts/type/:type` -> paginate/filter -> render danh sách.

### 8.3. AI xử lý bài viết

Client tạo bài -> backend gửi AI request -> AI callback -> backend cập nhật `status`, `type`, `embedding`.

### 8.4. Cập nhật realtime

Server phát event -> SSE stream -> client refetch dữ liệu.

## 9. Cấu trúc thư mục chính

```text
client/
  src/
    components/
    features/
    hooks/
    lib/
    route.ts
server/
  src/
    configs/
    constants/
    middlewares/
    modules/
    seeds/
    utils/
```

## 10. Chạy dự án

### 10.1. Client

```bash
cd client
npm install
npm run dev
```

### 10.2. Server

```bash
cd server
npm install
npm run dev
```

### 10.3. Build production

```bash
cd client
npm run build

cd ../server
npm run build
```

## 11. Ghi chú triển khai

- Backend đang dùng PostgreSQL qua TypeORM.
- Ảnh bài viết upload lên Cloudinary.
- Refresh token được lưu trong httpOnly cookie.
- Access token được giữ ở client store để gọi API.
- Realtime feed hiện tại được triển khai bằng SSE, ngoài ra codebase cũng có Socket.IO để mở rộng realtime theo room / user.

## 12. Mở rộng tiếp theo

- Chuẩn hoá thêm tài liệu cho từng module API.
- Thêm OpenAPI / Swagger nếu muốn mô tả hợp đồng API chi tiết hơn.
- Tách riêng env mẫu cho client và server.
- Bổ sung test cho service / controller / repository.
