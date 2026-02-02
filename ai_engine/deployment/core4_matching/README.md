---
title: AIReFound Matching Service
emoji: 🔔
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
app_port: 7860
---

# AIReFound Matching Service - Module "Chiếc Chuông"

## 📋 Tổng quan

Module backend xử lý logic matching AI cho ứng dụng tìm đồ thất lạc AIReFound. Hệ thống sử dụng Vector Search với PostgreSQL pgvector để tìm kiếm các bài đăng tương đồng giữa người mất đồ (LOST) và người tìm được đồ (FOUND).

## ✨ Tính năng chính

### 1. **Scan History** (Quét toàn bộ)
- User bấm "Chuông" trên bài LOST của mình
- Hệ thống quét toàn bộ bài FOUND trong database
- Tìm các bài có độ tương đồng cao (> threshold)
- Tạo match_candidates

### 2. **Realtime Scan** (Quét theo thời gian thực)
- Khi có bài FOUND mới được đăng
- Tự động quét với tất cả match_requests đang SCANNING
- Tạo candidates + gửi notifications

### 3. **Retry Mechanism**
- Xử lý trường hợp vector embedding chưa sẵn sàng
- Tự động retry sau 5 giây (max 3 lần)
- Đảm bảo không bỏ sót dữ liệu

## 🏗️ Kiến trúc

```
┌─────────────┐
│   FastAPI   │ ← API Layer (routers)
└──────┬──────┘
       │
┌──────▼──────┐
│   Celery    │ ← Task Queue (workers)
│   Workers   │
└──────┬──────┘
       │
┌──────▼──────┐
│  Services   │ ← Business Logic
│  - Matching │   (Vector Search, Scoring)
│  - Notification
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │ ← Database
│  + pgvector │   (Vector Storage & Search)
└─────────────┘
```

## 🚀 Cài đặt

### 1. Cài đặt dependencies

```bash
pip install -r requirements.txt
```

### 2. Cấu hình môi trường

Copy file `.env.example` thành `.env` và cập nhật các giá trị:

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Database
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# Redis
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# Matching Config
SIMILARITY_THRESHOLD=0.75
MAX_CANDIDATES=20
```

### 3. Khởi động Redis

```bash
# Docker
docker run -d -p 6379:6379 redis:latest

# Hoặc native
redis-server
```

### 4. Khởi động Celery Worker

```bash
celery -A app.core.celery_app:celery_app worker --loglevel=info -Q matching
```

### 5. Khởi động FastAPI

```bash
# Development
uvicorn app.main:app --reload --port 8000

# Production
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📡 API Endpoints

### 1. Tạo Match Request (Bấm chuông)

```http
POST /api/v1/matching/match-requests
Content-Type: application/json

{
  "lost_post_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:**
```json
{
  "request_id": "660e8400-e29b-41d4-a716-446655440001",
  "lost_post_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "770e8400-e29b-41d4-a716-446655440002",
  "status": "SCANNING",
  "created_at": "2026-02-02T10:30:00Z",
  "message": "Match request created successfully. Task ID: abc-123"
}
```

### 2. Webhook cho bài FOUND mới

```http
POST /api/v1/matching/webhook/new-post
Content-Type: application/json

{
  "new_found_post_id": "880e8400-e29b-41d4-a716-446655440003"
}
```

### 3. Lấy danh sách candidates

```http
GET /api/v1/matching/match-requests/{request_id}/candidates
```

### 4. Hủy match request

```http
POST /api/v1/matching/match-requests/{request_id}/cancel
```

### 5. Health check

```http
GET /api/v1/matching/health
```

## 🔧 Cấu hình Vector Search

### Công thức tính Similarity Score

```
Score = w1 × Sim(Img, Img) + w2 × Sim(Text, Img) + w3 × KeywordMatch
```

Trong đó:
- **w1** (WEIGHT_IMAGE_IMAGE): Trọng số so sánh ảnh vs ảnh (default: 0.5)
- **w2** (WEIGHT_TEXT_IMAGE): Trọng số so sánh text vs ảnh (default: 0.3)
- **w3** (WEIGHT_KEYWORD_MATCH): Trọng số keyword matching (default: 0.2)

Điều chỉnh trong file `.env`:

```env
WEIGHT_IMAGE_IMAGE=0.5
WEIGHT_TEXT_IMAGE=0.3
WEIGHT_KEYWORD_MATCH=0.2
```

## 🔄 Luồng xử lý

### Luồng 1: Scan History

```mermaid
sequenceDiagram
    User->>API: POST /match-requests
    API->>Database: Create match_request
    API->>Celery: Dispatch scan_history_task
    API-->>User: 201 Created
    
    Celery->>Database: Check vector exists
    alt Vector không có
        Celery->>Celery: Retry sau 5s (max 3 lần)
    end
    
    Celery->>Database: Vector Search
    Celery->>Database: Insert match_candidates
    Celery-->>User: Done
```

### Luồng 2: Realtime Scan

```mermaid
sequenceDiagram
    Webhook->>API: POST /webhook/new-post
    API->>Celery: Dispatch scan_realtime_task
    API-->>Webhook: 202 Accepted
    
    Celery->>Database: Check vector exists
    alt Vector chưa có
        Celery->>Celery: Retry sau 5s
    end
    
    Celery->>Database: Find SCANNING requests
    Celery->>Database: Calculate similarity
    Celery->>Database: Insert candidates
    Celery->>Database: Create notifications
```

## 📊 Monitoring & Logging

### Celery Tasks Monitoring

```bash
# Flower - Celery monitoring tool
celery -A app.core.celery_app:celery_app flower --port=5555
```

Truy cập: http://localhost:5555

### Logs

Logs được xuất ra console với format:

```
2026-02-02 10:30:00 - app.worker - INFO - [SCAN_HISTORY] Starting for lost_post=...
2026-02-02 10:30:05 - app.services.matching_service - INFO - Found 5 matching posts
2026-02-02 10:30:06 - app.worker - INFO - [SCAN_HISTORY] ✓ Created 5 candidates
```

## 🧪 Testing

### Test Vector Check

```python
from app.worker import test_vector_check

# Async call
result = test_vector_check.apply_async(args=['post_id_here'])
print(result.get())
```

### Test Database Connection

```bash
python -c "from app.core.database import test_connection; test_connection()"
```

## 🐛 Troubleshooting

### 1. Vector không được tìm thấy

**Nguyên nhân:** Service embedding chưa xử lý xong

**Giải pháp:** Worker sẽ tự động retry, kiểm tra logs để theo dõi

### 2. Celery task bị stuck

```bash
# Purge queue
celery -A app.core.celery_app:celery_app purge

# Restart worker
celery -A app.core.celery_app:celery_app worker --loglevel=info -Q matching
```

### 3. Database connection pool exhausted

Tăng `pool_size` trong `app/core/database.py`:

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,  # Tăng từ 10
    max_overflow=40  # Tăng từ 20
)
```

## 📝 Notes

1. **Vector dimension:** Hiện tại sử dụng 512 chiều (đã update từ 1536)
2. **Cosine Distance:** Sử dụng operator `<=>` của pgvector
3. **Retry mechanism:** Tự động retry khi vector chưa có (5s interval, max 3 lần)
4. **Threshold:** Default 0.75, có thể điều chỉnh trong `.env`

## 🔐 Security

- Sử dụng Supabase Service Role Key cho các thao tác admin
- Validate user_id trước khi tạo match_request
- Rate limiting nên được implement ở API Gateway layer

## 📚 Tài liệu tham khảo

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Python Client](https://supabase.com/docs/reference/python/)

## 👥 Contributors

- Backend Engineer Team
- AI/ML Team (Vector Embedding Service)

## 📄 License

Proprietary - AIReFound Project
