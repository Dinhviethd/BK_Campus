# 🚀 Deployment Guide - AIReFound Matching Service

## 📋 Yêu cầu hệ thống

### Production Environment
- Python 3.10+
- PostgreSQL 14+ với extension pgvector
- Redis 6+
- 2GB RAM minimum (recommended: 4GB)
- 2 CPU cores minimum (recommended: 4 cores)

### Services cần thiết
1. **PostgreSQL với pgvector** - Đã được setup trong Supabase
2. **Redis** - Message broker cho Celery
3. **FastAPI Application** - API Server
4. **Celery Workers** - Background task processing

---

## 🔧 Setup Guide

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone repository
git clone <repo-url>
cd aireFound_matching_module

# 2. Setup environment
cp .env.example .env
# Edit .env với thông tin thực tế

# 3. Build và start services
docker-compose up -d

# 4. Check logs
docker-compose logs -f

# 5. Stop services
docker-compose down
```

Truy cập:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Flower (Celery Monitor): http://localhost:5555

---

### Option 2: Manual Setup

#### Step 1: Cài đặt Dependencies

```bash
# Create virtual environment
python3.10 -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Install packages
pip install -r requirements.txt
```

#### Step 2: Setup Redis

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# MacOS
brew install redis
brew services start redis

# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

#### Step 3: Configure Environment

```bash
cp .env.example .env
nano .env  # hoặc vim, code, etc.
```

Cập nhật các giá trị:
```env
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
REDIS_URL=redis://localhost:6379/0
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-key
```

#### Step 4: Verify Database Setup

```bash
# Test connection
python -c "from app.core.database import test_connection; test_connection()"
```

Đảm bảo pgvector extension đã được enable:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### Step 5: Start Services

**Terminal 1 - API Server:**
```bash
./start_api.sh dev
# hoặc
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Celery Worker:**
```bash
./start_worker.sh
# hoặc
celery -A app.core.celery_app:celery_app worker --loglevel=info -Q matching
```

**Terminal 3 - Flower (Optional):**
```bash
celery -A app.core.celery_app:celery_app flower --port=5555
```

---

## 🏭 Production Deployment

### 1. systemd Services (Linux)

#### API Service

Tạo file `/etc/systemd/system/aireFound-api.service`:

```ini
[Unit]
Description=AIReFound Matching API
After=network.target

[Service]
Type=notify
User=www-data
Group=www-data
WorkingDirectory=/var/www/aireFound_matching_module
Environment="PATH=/var/www/aireFound_matching_module/venv/bin"
ExecStart=/var/www/aireFound_matching_module/venv/bin/gunicorn \
    app.main:app \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile /var/log/aireFound/api-access.log \
    --error-logfile /var/log/aireFound/api-error.log

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### Celery Worker Service

Tạo file `/etc/systemd/system/aireFound-worker.service`:

```ini
[Unit]
Description=AIReFound Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=www-data
Group=www-data
WorkingDirectory=/var/www/aireFound_matching_module
Environment="PATH=/var/www/aireFound_matching_module/venv/bin"
ExecStart=/var/www/aireFound_matching_module/venv/bin/celery \
    -A app.core.celery_app:celery_app worker \
    --loglevel=info \
    -Q matching \
    --concurrency=4 \
    --pidfile=/var/run/celery/worker.pid \
    --logfile=/var/log/aireFound/worker.log

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### Enable và Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable aireFound-api
sudo systemctl enable aireFound-worker

# Start services
sudo systemctl start aireFound-api
sudo systemctl start aireFound-worker

# Check status
sudo systemctl status aireFound-api
sudo systemctl status aireFound-worker

# View logs
sudo journalctl -u aireFound-api -f
sudo journalctl -u aireFound-worker -f
```

### 2. Nginx Reverse Proxy

Tạo file `/etc/nginx/sites-available/aireFound-api`:

```nginx
upstream aireFound_api {
    server 127.0.0.1:8000;
}

server {
    listen 80;
    server_name api.aireFound.com;  # Thay bằng domain của bạn

    client_max_body_size 10M;

    location / {
        proxy_pass http://aireFound_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /api/v1/matching/health {
        proxy_pass http://aireFound_api;
        access_log off;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/aireFound-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.aireFound.com
```

---

## 🔍 Monitoring & Logging

### 1. Application Logs

```bash
# API logs
tail -f /var/log/aireFound/api-access.log
tail -f /var/log/aireFound/api-error.log

# Worker logs
tail -f /var/log/aireFound/worker.log

# Systemd logs
journalctl -u aireFound-api -f
journalctl -u aireFound-worker -f
```

### 2. Celery Flower Dashboard

Access: http://your-server:5555

Monitor:
- Active tasks
- Task history
- Worker status
- Success/failure rates

### 3. Health Checks

```bash
# API health
curl http://localhost:8000/api/v1/matching/health

# Redis health
redis-cli ping

# Database health
psql -U postgres -c "SELECT 1"
```

---

## 🔧 Maintenance

### Restart Services

```bash
# Restart API
sudo systemctl restart aireFound-api

# Restart Worker
sudo systemctl restart aireFound-worker

# Restart all
sudo systemctl restart aireFound-api aireFound-worker
```

### Update Code

```bash
cd /var/www/aireFound_matching_module

# Pull latest code
git pull origin main

# Activate venv
source venv/bin/activate

# Update dependencies
pip install -r requirements.txt

# Restart services
sudo systemctl restart aireFound-api aireFound-worker
```

### Clear Celery Queue

```bash
celery -A app.core.celery_app:celery_app purge
```

### Database Migrations

Nếu có thay đổi schema:
```bash
# Backup database trước
pg_dump -U postgres aireFound > backup_$(date +%Y%m%d).sql

# Run migrations (nếu có)
# alembic upgrade head
```

---

## 📊 Performance Tuning

### 1. Celery Workers

Điều chỉnh concurrency dựa trên CPU:
```bash
# Formula: số CPU cores * 2
celery -A app.core.celery_app:celery_app worker --concurrency=8
```

### 2. Gunicorn Workers

```bash
# Formula: (2 * CPU cores) + 1
gunicorn app.main:app -w 9 -k uvicorn.workers.UvicornWorker
```

### 3. Database Connection Pool

Trong `app/core/database.py`:
```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=20,        # Tăng nếu có nhiều concurrent requests
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600    # Recycle connections sau 1 hour
)
```

### 4. Redis Configuration

Trong `/etc/redis/redis.conf`:
```conf
maxmemory 2gb
maxmemory-policy allkeys-lru
save ""  # Disable persistence nếu chỉ dùng làm queue
```

---

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Enable firewall (ufw, firewalld)
- [ ] Setup SSL/TLS certificates
- [ ] Limit API rate (nginx limit_req)
- [ ] Setup fail2ban
- [ ] Regular security updates
- [ ] Backup database regularly
- [ ] Monitor logs for suspicious activity
- [ ] Use environment variables for secrets
- [ ] Enable Redis authentication

---

## 🆘 Troubleshooting

### API không start

```bash
# Check logs
journalctl -u aireFound-api -n 50

# Check port
sudo lsof -i :8000

# Test manual start
source venv/bin/activate
uvicorn app.main:app --port 8001
```

### Worker không process tasks

```bash
# Check worker status
celery -A app.core.celery_app:celery_app inspect active

# Check queue length
celery -A app.core.celery_app:celery_app inspect stats

# Restart worker
sudo systemctl restart aireFound-worker
```

### Vector search chậm

```sql
-- Check index
SELECT * FROM pg_indexes WHERE tablename = 'posts';

-- Rebuild index nếu cần
REINDEX INDEX posts_content_embedding_idx;
```

---

## 📞 Support

- Documentation: `/docs` endpoint
- GitHub Issues: [link]
- Team Contact: [email]

---

## 🔄 Backup & Recovery

### Database Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres aireFound > /backups/db_backup_$DATE.sql
find /backups -name "db_backup_*.sql" -mtime +7 -delete
```

### Restore Database

```bash
psql -U postgres aireFound < /backups/db_backup_20260202.sql
```

---

**Last Updated:** February 2, 2026
**Version:** 1.0.0
