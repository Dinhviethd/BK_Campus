# 🏗️ Architecture Documentation

## 📐 System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  (Web App, Mobile App, External Services)                   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
┌────────────────────▼────────────────────────────────────────┐
│                      FastAPI Layer                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Routers (API Endpoints)                             │   │
│  │  - POST /match-requests                              │   │
│  │  - POST /webhook/new-post                            │   │
│  │  - GET /match-requests/{id}/candidates               │   │
│  └──────────────────┬───────────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼──────┐           ┌────────▼────────┐
│   Services   │           │  Celery Queue   │
│              │           │   (Redis)       │
│ - Matching   │           └────────┬────────┘
│ - Notification│                   │
└──────┬───────┘           ┌────────▼────────┐
       │                   │  Celery Worker  │
       │                   │                 │
       │                   │  - scan_history │
       │                   │  - scan_realtime│
       │                   └────────┬────────┘
       │                            │
       └────────────┬───────────────┘
                    │
        ┌───────────▼────────────┐
        │   PostgreSQL + pgvector │
        │                         │
        │  - posts (with vectors) │
        │  - match_requests       │
        │  - match_candidates     │
        │  - notifications        │
        └─────────────────────────┘
```

---

## 🔄 Data Flow

### Flow 1: User Bấm Chuông (Scan History)

```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌────────┐     ┌──────────┐
│ User │────>│   API   │────>│  Celery  │────>│ Worker │────>│    DB    │
└──────┘     └─────────┘     │  Queue   │     └────────┘     └──────────┘
   POST                       └──────────┘          │
   /match-                                          │
   requests                                         │
                                                    ▼
   ┌────────────────────────────────────────────────────────┐
   │  Worker Logic:                                         │
   │  1. Check vector exists (retry if not)                │
   │  2. Query: SELECT FROM posts WHERE type='FOUND'       │
   │  3. Calculate similarity using pgvector               │
   │  4. Filter by threshold                               │
   │  5. INSERT INTO match_candidates                      │
   └────────────────────────────────────────────────────────┘
```

**Sequence Diagram:**

```
User          API          DB         Queue       Worker
 │             │            │           │           │
 │  POST       │            │           │           │
 ├────────────>│            │           │           │
 │             │ INSERT     │           │           │
 │             ├───────────>│           │           │
 │             │            │           │           │
 │             │ Dispatch   │           │           │
 │             ├───────────────────────>│           │
 │<────201─────│            │           │           │
 │             │            │           │  Consume  │
 │             │            │           ├──────────>│
 │             │            │           │           │
 │             │            │           │  Check    │
 │             │            │           │  Vector   │
 │             │            │<──────────────────────┤
 │             │            │           │           │
 │             │            │  Vector?  │           │
 │             │            ├──────────────────────>│
 │             │            │           │           │
 │             │            │   NO      │  RETRY    │
 │             │            │           │  (5s)     │
 │             │            │           │           │
 │             │            │  YES      │           │
 │             │            │<──────────────────────┤
 │             │            │           │           │
 │             │            │  Vector   │  Search   │
 │             │            │  Search   │           │
 │             │            │<──────────────────────┤
 │             │            │           │           │
 │             │            │  Results  │           │
 │             │            ├──────────────────────>│
 │             │            │           │           │
 │             │            │  INSERT   │  Create   │
 │             │            │  Candidates│  Candidates│
 │             │            │<──────────────────────┤
 │             │            │           │           │
```

---

### Flow 2: Bài FOUND Mới (Realtime Scan)

```
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌────────┐     ┌──────────┐
│Supabase │────>│Webhook  │────>│  Celery  │────>│ Worker │────>│    DB    │
│Trigger  │     │  API    │     │  Queue   │     └────────┘     └──────────┘
└─────────┘     └─────────┘     └──────────┘          │
   POST                                                │
   /webhook/                                           │
   new-post                                            ▼
                                         ┌─────────────────────────────────┐
                                         │  Worker Logic:                  │
                                         │  1. Check FOUND post vector     │
                                         │  2. Query SCANNING requests     │
                                         │  3. Calculate similarity        │
                                         │  4. INSERT candidates           │
                                         │  5. INSERT notifications        │
                                         └─────────────────────────────────┘
```

**Sequence Diagram:**

```
Embedding    Found      Webhook     Queue       Worker        DB
Service      Post         API                                
   │           │           │          │           │            │
   │  Insert   │           │          │           │            │
   │  New Post │           │          │           │            │
   ├──────────>│           │          │           │            │
   │           │           │          │           │            │
   │  Embed    │           │          │           │            │
   │  (async)  │           │          │           │            │
   │           │           │          │           │            │
   │           │  Trigger  │          │           │            │
   │           ├──────────>│          │           │            │
   │           │           │ Dispatch │           │            │
   │           │           ├─────────>│           │            │
   │           │<──202─────│          │           │            │
   │           │           │          │  Consume  │            │
   │           │           │          ├──────────>│            │
   │           │           │          │           │            │
   │  Update   │           │          │           │  Check     │
   │  Vector   │           │          │           │  Vector    │
   ├──────────>│           │          │           ├───────────>│
   │           │           │          │           │            │
   │           │           │          │           │  NULL?     │
   │           │           │          │           │<───────────┤
   │           │           │          │           │            │
   │           │           │          │           │  RETRY     │
   │           │           │          │           │  (5s)      │
   │           │           │          │           │            │
   │           │           │          │           │  Vector!   │
   │           │           │          │           │<───────────┤
   │           │           │          │           │            │
   │           │           │          │           │  Query     │
   │           │           │          │           │  SCANNING  │
   │           │           │          │           ├───────────>│
   │           │           │          │           │            │
   │           │           │          │           │  Requests  │
   │           │           │          │           │<───────────┤
   │           │           │          │           │            │
   │           │           │          │           │  Calculate │
   │           │           │          │           │  Similarity│
   │           │           │          │           │            │
   │           │           │          │           │  INSERT    │
   │           │           │          │           │  Candidates│
   │           │           │          │           ├───────────>│
   │           │           │          │           │            │
   │           │           │          │           │  INSERT    │
   │           │           │          │           │  Notif.    │
   │           │           │          │           ├───────────>│
```

---

## 🧩 Component Details

### 1. API Layer (FastAPI)

**Responsibilities:**
- HTTP request validation
- Authentication & authorization (future)
- Request/response serialization
- Task dispatching to Celery
- Error handling

**Key Files:**
- `app/main.py` - Application entry point
- `app/api/routers/matching.py` - API endpoints
- `app/schemas/matching.py` - Pydantic models

---

### 2. Service Layer

**MatchingService** (`app/services/matching_service.py`)

Core business logic cho matching:

```python
class MatchingService:
    def get_post_vectors(post_id) -> Dict
        # Lấy content + image vectors
    
    def check_vector_exists(post_id) -> bool
        # Kiểm tra vector đã có chưa
    
    def find_matching_found_posts(lost_post_id) -> List[Dict]
        # Vector search: LOST -> FOUND
        # SQL: ORDER BY embedding <=> input_vector
    
    def find_matching_lost_requests(found_post_id) -> List[Dict]
        # Vector search: FOUND -> LOST (với SCANNING requests)
    
    def calculate_combined_score() -> float
        # Score = w1*Sim(Img,Img) + w2*Sim(Text,Img) + w3*Keyword
```

**NotificationService** (`app/services/notification_service.py`)

```python
class NotificationService:
    def create_system_match_notification()
    def create_batch_notifications()
    def mark_as_read()
    def get_user_notifications()
```

---

### 3. Worker Layer (Celery)

**Tasks** (`app/worker.py`)

```python
@celery_app.task
def scan_history_task(lost_post_id, request_id):
    """
    1. Check vector (retry if NULL)
    2. Vector search
    3. Insert candidates
    """

@celery_app.task(base=VectorCheckTask)
def scan_realtime_task(new_found_post_id):
    """
    1. Check vector (retry với countdown=5s)
    2. Find SCANNING requests
    3. Calculate similarity
    4. Insert candidates + notifications
    """
```

**Retry Mechanism:**

```python
class VectorCheckTask(Task):
    autoretry_for = (Exception,)
    retry_kwargs = {
        'max_retries': 3,
        'countdown': 5  # seconds
    }
```

**Retry Flow:**

```
Attempt 1: Vector NULL -> Retry (wait 5s)
Attempt 2: Vector NULL -> Retry (wait 5s)
Attempt 3: Vector NULL -> Retry (wait 5s)
Attempt 4: Vector NULL -> FAIL (update request status)
```

---

### 4. Database Layer (PostgreSQL)

**Schema Overview:**

```
posts (LOST/FOUND posts)
├── id (UUID)
├── content
├── content_embedding (vector(512))
└── type (LOST/FOUND)

post_images
├── id
├── post_id (FK)
├── url
└── embedding (vector(512))

match_requests (Cái Chuông)
├── id
├── lost_post_id (FK)
├── user_id (FK)
├── status (SCANNING/COMPLETED/CANCELLED)
└── last_scan_at

match_candidates (Kết quả matching)
├── id
├── request_id (FK)
├── found_post_id (FK)
├── similarity_score
└── status (PENDING/ACCEPTED/REJECTED)

notifications
├── id
├── user_id (FK)
├── type (SOCIAL/SYSTEM_MATCH)
├── reference_id (candidate_id)
└── is_read
```

**Vector Search Query:**

```sql
-- Cosine Distance Search
SELECT 
    id,
    content,
    content_embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM posts
WHERE type = 'FOUND'
    AND status = 'ACTIVE'
ORDER BY content_embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 20;
```

**Index:**
```sql
CREATE INDEX ON posts 
USING hnsw (content_embedding vector_cosine_ops);
```

---

## 🔐 Security Considerations

### 1. Input Validation
- UUID validation (Pydantic)
- Post type validation (LOST/FOUND)
- Status validation (ACTIVE)

### 2. Authorization (Future)
- User can only create requests for their own posts
- JWT token validation
- Rate limiting per user

### 3. Data Privacy
- No PII in logs
- Encrypted connections (SSL/TLS)
- Supabase RLS (Row Level Security)

---

## ⚡ Performance Optimizations

### 1. Vector Search
- **HNSW Index:** O(log n) search complexity
- **Batch Processing:** Process multiple candidates at once
- **Caching:** Redis cache for frequently accessed vectors (future)

### 2. Database
- **Connection Pooling:** Reuse connections (pool_size=10)
- **Prepared Statements:** SQLAlchemy query compilation
- **Index Optimization:** HNSW for vectors, B-tree for FKs

### 3. Celery
- **Prefetch Limit:** worker_prefetch_multiplier=1
- **Max Tasks Per Child:** 1000 (prevent memory leaks)
- **Concurrency:** 4 workers by default

### 4. Caching Strategy (Future)

```python
# Redis cache for vectors
def get_post_vectors_cached(post_id):
    cache_key = f"vectors:{post_id}"
    cached = redis.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    vectors = get_post_vectors(post_id)
    redis.setex(cache_key, 3600, json.dumps(vectors))
    return vectors
```

---

## 📊 Scalability

### Horizontal Scaling

```
          ┌─────────────┐
          │  Load       │
          │  Balancer   │
          └──────┬──────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
┌─────▼────┐ ┌──▼─────┐ ┌──▼─────┐
│  API     │ │  API   │ │  API   │
│  Node 1  │ │ Node 2 │ │ Node 3 │
└──────────┘ └────────┘ └────────┘
      │          │          │
      └──────────┼──────────┘
                 │
          ┌──────▼──────┐
          │   Redis     │
          │   Cluster   │
          └──────┬──────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
┌─────▼────┐ ┌──▼─────┐ ┌──▼─────┐
│ Worker 1 │ │Worker 2│ │Worker 3│
└──────────┘ └────────┘ └────────┘
      │          │          │
      └──────────┼──────────┘
                 │
          ┌──────▼──────┐
          │ PostgreSQL  │
          │  (Primary)  │
          └──────┬──────┘
                 │
          ┌──────▼──────┐
          │ PostgreSQL  │
          │  (Replica)  │
          └─────────────┘
```

### Capacity Planning

**Current Configuration:**
- API: 4 Gunicorn workers
- Celery: 4 worker processes
- Database: 10 connections pool

**Expected Throughput:**
- API: ~1000 req/s
- Workers: ~100 tasks/min
- Vector Search: ~50ms/query

**Scale Triggers:**
- CPU > 70% → Add API nodes
- Queue depth > 100 → Add workers
- DB connections > 80% → Increase pool size

---

## 🔍 Monitoring Points

### Application Metrics
- API response time
- Task processing time
- Success/failure rate
- Queue depth

### Database Metrics
- Query execution time
- Index usage
- Connection pool utilization
- Vector search latency

### Infrastructure Metrics
- CPU usage
- Memory usage
- Disk I/O
- Network throughput

---

## 🚨 Error Handling

### Error Categories

1. **Validation Errors** (400)
   - Invalid UUID
   - Wrong post type
   - Post not active

2. **Not Found Errors** (404)
   - Post not found
   - Request not found

3. **Conflict Errors** (409)
   - Duplicate request

4. **Server Errors** (500)
   - Database errors
   - Vector search errors
   - Worker failures

### Retry Strategy

```
Task Type         Max Retries    Countdown    Backoff
──────────────────────────────────────────────────────
scan_history         3             5s          No
scan_realtime        3             5s         Yes
cleanup              1            60s          No
```

---

## 📝 Future Enhancements

1. **Caching Layer**
   - Redis cache for vectors
   - Query result caching

2. **ML Improvements**
   - Fine-tune similarity weights
   - Add location-based boosting
   - Time decay for old posts

3. **Monitoring**
   - Prometheus metrics
   - Grafana dashboards
   - Alert rules

4. **Performance**
   - Vector quantization (reduce from 512 to 256)
   - Approximate nearest neighbor
   - Batch vector processing

---

**Last Updated:** February 2, 2026  
**Version:** 1.0.0
