# 📦 AIReFound Matching Module - Project Overview

## 📁 Project Structure

```
aireFound_matching_module/
├── app/                          # Main application code
│   ├── __init__.py
│   ├── main.py                   # FastAPI application entry point
│   ├── worker.py                 # Celery tasks (CORE LOGIC)
│   │
│   ├── api/                      # API layer
│   │   ├── __init__.py
│   │   └── routers/
│   │       ├── __init__.py
│   │       └── matching.py       # API endpoints
│   │
│   ├── core/                     # Core configurations
│   │   ├── __init__.py
│   │   ├── config.py             # Settings & environment variables
│   │   ├── celery_app.py         # Celery configuration
│   │   └── database.py           # Database connection & session
│   │
│   ├── services/                 # Business logic layer
│   │   ├── __init__.py
│   │   ├── matching_service.py   # Vector search & matching logic ⭐
│   │   └── notification_service.py
│   │
│   ├── schemas/                  # Pydantic models
│   │   ├── __init__.py
│   │   └── matching.py           # Request/Response schemas
│   │
│   ├── models/                   # Database models (future ORM)
│   │   └── __init__.py
│   │
│   └── utils/                    # Utility functions
│       └── __init__.py
│
├── ARCHITECTURE.md               # Detailed architecture documentation
├── DEPLOYMENT.md                 # Deployment guide
├── README.md                     # Getting started guide
├── requirements.txt              # Python dependencies
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
│
├── Dockerfile                    # Docker image definition
├── docker-compose.yml            # Multi-container setup
│
├── start_api.sh                  # Script to start FastAPI server
├── start_worker.sh               # Script to start Celery worker
└── test_demo.py                  # Demo & testing scripts
```

---

## 🎯 Core Components

### 1. **worker.py** - The Heart of the System ❤️

Chứa 2 task chính:

#### Task 1: `scan_history_task`
**Trigger:** User bấm chuông (POST /match-requests)

**Flow:**
```python
1. Check vector exists (với retry mechanism)
2. Vector search: Tìm các bài FOUND khớp
3. Insert vào match_candidates
```

#### Task 2: `scan_realtime_task`
**Trigger:** Webhook khi có bài FOUND mới

**Flow:**
```python
1. Check vector exists (RETRY nếu NULL - đây là điểm quan trọng!)
2. Tìm các match_requests đang SCANNING
3. Calculate similarity với từng LOST post
4. Insert candidates + notifications
```

**Retry Mechanism:**
```python
class VectorCheckTask(Task):
    autoretry_for = (Exception,)
    retry_kwargs = {
        'max_retries': 3,
        'countdown': 5  # Wait 5 seconds between retries
    }
```

---

### 2. **matching_service.py** - Vector Search Engine 🔍

Core functions:

```python
class MatchingService:
    
    # Vector Operations
    def get_post_vectors(post_id) -> Dict
        """Lấy content + image vectors"""
    
    def check_vector_exists(post_id) -> bool
        """Kiểm tra vector đã ready chưa (cho retry)"""
    
    # Matching Operations
    def find_matching_found_posts(lost_post_id) -> List[Dict]
        """
        Vector Search: LOST -> FOUND
        SQL: ORDER BY embedding <=> input_vector
        """
    
    def find_matching_lost_requests(found_post_id) -> List[Dict]
        """
        Vector Search: FOUND -> LOST
        Chỉ query requests có status='SCANNING'
        """
    
    # Scoring
    def _calculate_combined_score() -> float
        """
        Score = w1*Sim(Img,Img) + w2*Sim(Text,Img) + w3*Keyword
        """
    
    # Database Operations
    def create_match_candidates(request_id, candidates) -> int
        """Bulk insert candidates"""
```

**Vector Search Query Example:**

```sql
SELECT 
    id,
    content,
    content_embedding <=> '[0.1,0.2,...]'::vector AS distance
FROM posts
WHERE type = 'FOUND' 
    AND status = 'ACTIVE'
ORDER BY content_embedding <=> '[0.1,0.2,...]'::vector
LIMIT 20;
```

---

### 3. **matching.py (router)** - API Endpoints 🌐

```python
POST /api/v1/matching/match-requests
    → Tạo match request
    → Dispatch scan_history_task

POST /api/v1/matching/webhook/new-post
    → Nhận webhook cho bài FOUND mới
    → Dispatch scan_realtime_task

GET /api/v1/matching/match-requests/{id}/candidates
    → Lấy danh sách candidates

POST /api/v1/matching/match-requests/{id}/cancel
    → Hủy match request (tắt chuông)

GET /api/v1/matching/health
    → Health check
```

---

## 🔄 Complete Data Flow

### Scenario 1: User Bấm Chuông

```
User (App)
  │
  │ POST /match-requests {"lost_post_id": "abc"}
  ▼
FastAPI Router
  │
  ├─► Validate post (LOST, ACTIVE)
  ├─► Insert match_requests (status=SCANNING)
  ├─► Dispatch task to Celery
  │
  ▼
Celery Queue (Redis)
  │
  ▼
Worker: scan_history_task
  │
  ├─► Check vector exists?
  │   ├─ YES → Continue
  │   └─ NO  → RETRY (wait 5s, max 3 times)
  │
  ├─► MatchingService.find_matching_found_posts()
  │   │
  │   ├─► Get vector of LOST post
  │   ├─► SQL Vector Search (ORDER BY embedding <=>)
  │   ├─► Calculate combined score
  │   └─► Filter by threshold (0.75)
  │
  └─► Insert match_candidates
  
Database
  │
  └─► match_candidates table updated
```

---

### Scenario 2: Bài FOUND Mới

```
Embedding Service
  │
  │ 1. Insert new FOUND post
  │ 2. Calculate embedding (takes 5-10 seconds)
  │ 3. Update content_embedding column
  ▼
Supabase Trigger/Webhook
  │
  │ POST /webhook/new-post {"new_found_post_id": "xyz"}
  ▼
FastAPI Router
  │
  ├─► Validate post (FOUND)
  ├─► Dispatch task to Celery
  │
  ▼
Celery Queue
  │
  ▼
Worker: scan_realtime_task ⭐ (With Retry!)
  │
  ├─► Check vector exists?
  │   ├─ NO  → RETRY #1 (wait 5s)
  │   ├─ NO  → RETRY #2 (wait 5s)
  │   ├─ YES → Continue!
  │
  ├─► MatchingService.find_matching_lost_requests()
  │   │
  │   ├─► Get vector of FOUND post
  │   ├─► Query all SCANNING requests
  │   ├─► For each request:
  │   │   ├─► Calculate similarity
  │   │   └─► Filter by threshold
  │   │
  │   └─► Return matching requests
  │
  ├─► Insert match_candidates
  │
  └─► Insert notifications (type=SYSTEM_MATCH)
  
Database
  │
  ├─► match_candidates updated
  └─► notifications created
  
User
  │
  └─► 🔔 Nhận notification: "Tìm thấy đồ khớp!"
```

---

## 🔑 Key Technical Decisions

### 1. **Why Retry Mechanism?**

**Problem:**
- Embedding service cần 5-10 giây để tính vector
- Worker có thể chạy TRƯỚC khi vector ready
- Không thể bỏ sót data!

**Solution:**
```python
@celery_app.task(base=VectorCheckTask)
def scan_realtime_task(self, new_found_post_id):
    if not matching_service.check_vector_exists(post_id):
        # Tự động retry sau 5 giây
        raise self.retry(countdown=5)
```

---

### 2. **Why Separate Tasks?**

| Task | Trigger | Frequency | Priority |
|------|---------|-----------|----------|
| scan_history | User action | Low | Normal |
| scan_realtime | System event | High | High |

- `scan_history`: User chủ động, có thể chờ
- `scan_realtime`: Tự động, cần xử lý nhanh

---

### 3. **Why PostgreSQL pgvector?**

**Alternatives considered:**
- ✗ Elasticsearch: Complex setup, overkill
- ✗ Pinecone/Weaviate: External service, cost
- ✓ **pgvector**: In-database, fast, simple

**Performance:**
- HNSW index: O(log n) search
- Cosine similarity: Hardware optimized
- ~50ms per query (512-dim vectors)

---

### 4. **Why Celery + Redis?**

**Alternatives:**
- ✗ Direct API calls: Blocking, timeout issues
- ✗ Background threads: No retry, hard to monitor
- ✓ **Celery**: Retry, monitoring, scalable

---

## 📊 Similarity Score Formula

```
Score = w1 × Sim(Img_lost, Img_found) 
      + w2 × Sim(Text_lost, Img_found)
      + w3 × Sim(Text_lost, Text_found)

Default weights:
w1 = 0.5  (Image-to-Image)
w2 = 0.3  (Text-to-Image cross-modal)
w3 = 0.2  (Keyword match)

Similarity = 1 - Cosine_Distance
```

**Configurable in .env:**
```env
WEIGHT_IMAGE_IMAGE=0.5
WEIGHT_TEXT_IMAGE=0.3
WEIGHT_KEYWORD_MATCH=0.2
```

---

## 🚀 Quick Start

### Using Docker Compose (Recommended)

```bash
# 1. Clone & setup
git clone <repo>
cd aireFound_matching_module
cp .env.example .env
# Edit .env with real credentials

# 2. Start all services
docker-compose up -d

# 3. Check logs
docker-compose logs -f

# 4. Access
# API: http://localhost:8000/docs
# Flower: http://localhost:5555
```

### Manual Setup

```bash
# 1. Install dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 2. Setup .env
cp .env.example .env
nano .env

# 3. Start Redis
redis-server

# 4. Start Worker (Terminal 1)
./start_worker.sh

# 5. Start API (Terminal 2)
./start_api.sh dev
```

---

## 🧪 Testing

```bash
# Health check
curl http://localhost:8000/api/v1/matching/health

# Test full flow (requires real post IDs)
python test_demo.py

# Test specific endpoint
python test_demo.py create <lost_post_id>
python test_demo.py webhook <found_post_id>
```

---

## 📈 Monitoring

### Celery Flower Dashboard
```bash
# Access: http://localhost:5555

Features:
- Active tasks
- Task history
- Success/failure rates
- Worker status
```

### Logs
```bash
# API logs
docker-compose logs -f api

# Worker logs
docker-compose logs -f celery_worker

# All logs
docker-compose logs -f
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Redis
REDIS_URL=redis://localhost:6379/0

# Matching Config
SIMILARITY_THRESHOLD=0.75      # Minimum similarity to create candidate
MAX_CANDIDATES=20              # Max results per search
VECTOR_CHECK_RETRY_DELAY=5     # Seconds between retries
VECTOR_CHECK_MAX_RETRIES=3     # Max retry attempts

# Weights (sum should be 1.0)
WEIGHT_IMAGE_IMAGE=0.5
WEIGHT_TEXT_IMAGE=0.3
WEIGHT_KEYWORD_MATCH=0.2
```

---

## 📚 Documentation Files

1. **README.md** - Getting started, installation, basic usage
2. **ARCHITECTURE.md** - System design, data flow, scaling
3. **DEPLOYMENT.md** - Production deployment guide
4. **PROJECT_OVERVIEW.md** (this file) - Quick reference

---

## 🎓 Learning Resources

### Understanding the Code

**Start here:**
1. `app/worker.py` - See the main task logic
2. `app/services/matching_service.py` - Vector search implementation
3. `app/api/routers/matching.py` - API endpoints

**Key concepts to understand:**
- Celery retry mechanism
- PostgreSQL pgvector operators
- Cosine similarity calculation
- Async task queues

---

## 🐛 Common Issues & Solutions

### 1. Worker không xử lý tasks

```bash
# Check Celery worker status
celery -A app.core.celery_app:celery_app inspect active

# Restart worker
docker-compose restart celery_worker
```

### 2. Vector search trả về rỗng

```sql
-- Check if vectors exist
SELECT 
    COUNT(*) as total,
    COUNT(content_embedding) as has_content_vec
FROM posts 
WHERE type = 'FOUND' AND status = 'ACTIVE';

-- Check vector dimensions
SELECT 
    id, 
    array_length(content_embedding::float[], 1) as dimension
FROM posts 
LIMIT 5;
```

### 3. Task retry vô hạn

- Check vector service hoạt động chưa
- Verify max_retries config
- Check worker logs

---

## 💡 Best Practices

### When Adding New Features

1. **Add to service layer first** (`services/`)
2. **Write task in worker.py** (if async needed)
3. **Create API endpoint** (`api/routers/`)
4. **Update schemas** (`schemas/`)
5. **Document in README**

### Code Style

- Use type hints
- Add docstrings
- Log important operations
- Handle errors gracefully

### Database Queries

- Use parameterized queries (prevent SQL injection)
- Add indexes for frequently queried columns
- Monitor query performance

---

## 🔮 Future Roadmap

### Phase 1 (Current) ✅
- [x] Basic matching functionality
- [x] Retry mechanism
- [x] Vector search with pgvector
- [x] Notifications

### Phase 2 (Planned)
- [ ] Redis caching for vectors
- [ ] Advanced scoring (location, time decay)
- [ ] User feedback loop (improve AI)
- [ ] Prometheus metrics

### Phase 3 (Future)
- [ ] Multi-language support
- [ ] Image recognition improvements
- [ ] Real-time chat integration
- [ ] Mobile push notifications

---

## 👥 Team

- **Backend Team**: API & Worker development
- **ML Team**: Embedding service
- **DevOps**: Deployment & monitoring

---

## 📄 License

Proprietary - AIReFound Project

---

## 📞 Support

- Issues: GitHub Issues
- Docs: `/docs` endpoint
- Email: team@aireFound.com

---

**Last Updated:** February 2, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
