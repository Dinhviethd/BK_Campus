"""
Celery Application Configuration
Quản lý task queue và worker configuration
"""
from celery import Celery
from app.core.config import settings

# Khởi tạo Celery App
celery_app = Celery(
    "aireFound_matching",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['app.worker']  # Import worker tasks
)

# Cấu hình Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Ho_Chi_Minh',
    enable_utc=True,
    
    # Task routing
    task_routes={
        'app.worker.scan_history_task': {'queue': 'matching'},
        'app.worker.scan_realtime_task': {'queue': 'matching'},
    },
    
    # Worker configuration
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    
    # Result backend
    result_expires=3600,  # 1 hour
    
    # Retry configuration
    task_acks_late=True,
    task_reject_on_worker_lost=True,
)

# Task configuration
celery_app.conf.task_default_retry_delay = settings.VECTOR_CHECK_RETRY_DELAY
celery_app.conf.task_max_retries = settings.VECTOR_CHECK_MAX_RETRIES
