"""
Database Connection Module
Quản lý kết nối PostgreSQL và session
"""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from contextlib import contextmanager
from typing import Generator
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Tạo engine với connection pooling
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Kiểm tra connection trước khi sử dụng
    pool_size=10,
    max_overflow=20,
    echo=False  # Set True để debug SQL queries
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class cho ORM models (nếu cần dùng ORM)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function để lấy database session
    Sử dụng trong FastAPI routes
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager để lấy database session
    Sử dụng trong Celery workers
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        db.close()


def test_connection():
    """Kiểm tra kết nối database"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            logger.info("✓ Database connection successful")
            return True
    except Exception as e:
        logger.error(f"✗ Database connection failed: {e}")
        return False