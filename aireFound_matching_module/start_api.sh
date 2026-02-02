#!/bin/bash

# Start FastAPI Server for AIReFound Matching Service
# Usage: ./start_api.sh

echo "🚀 Starting FastAPI Server..."

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✓ Virtual environment activated"
fi

# Development mode
if [ "$1" == "dev" ]; then
    echo "📦 Running in DEVELOPMENT mode..."
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
else
    # Production mode
    echo "🏭 Running in PRODUCTION mode..."
    gunicorn app.main:app \
        -w 4 \
        -k uvicorn.workers.UvicornWorker \
        --bind 0.0.0.0:8000 \
        --access-logfile - \
        --error-logfile - \
        --log-level info
fi

# Usage:
# ./start_api.sh         # Production
# ./start_api.sh dev     # Development
