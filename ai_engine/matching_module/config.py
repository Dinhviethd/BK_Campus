"""
Core Configuration Module
Quản lý các biến môi trường và cấu hình hệ thống
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Cấu hình ứng dụng từ biến môi trường"""
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # Database
    DATABASE_URL: str
    
    # Redis & Celery
    REDIS_URL: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str
    
    # Matching Configuration
    SIMILARITY_THRESHOLD: float = 0.75
    MAX_CANDIDATES: int = 20
    
    # Vector Retry Configuration
    VECTOR_CHECK_RETRY_DELAY: int = 5  # seconds
    VECTOR_CHECK_MAX_RETRIES: int = 3
    
    # Matching Score Weights (theo README.md)
    WEIGHT_IMAGE_IMAGE: float = 0.5
    WEIGHT_TEXT_IMAGE: float = 0.3
    WEIGHT_KEYWORD_MATCH: float = 0.2
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton instance
settings = Settings()