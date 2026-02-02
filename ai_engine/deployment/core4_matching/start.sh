#!/bin/bash

# Không cần chạy redis-server nữa!

# 1. Khởi động Celery Worker
# Lưu ý: HF Spaces free tier có 2 vCPU, nên set concurrency=2 là đẹp
celery -A app.core.celery_app:celery_app worker --loglevel=info -Q matching --concurrency=2 &

# 2. Khởi động FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 7860