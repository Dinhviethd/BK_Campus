#!/bin/bash

# Start Celery Worker for AIReFound Matching Service
# Usage: ./start_worker.sh

echo "🚀 Starting Celery Worker for Matching Service..."

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✓ Virtual environment activated"
fi

# Start Celery worker
celery -A app.core.celery_app:celery_app worker \
    --loglevel=info \
    --queues=matching \
    --concurrency=4 \
    --max-tasks-per-child=100 \
    --time-limit=300 \
    --soft-time-limit=240

# Notes:
# --concurrency=4: Số worker processes
# --max-tasks-per-child=100: Restart worker sau 100 tasks (tránh memory leak)
# --time-limit=300: Hard limit 5 phút cho mỗi task
# --soft-time-limit=240: Soft limit 4 phút
