"""
AIReFound Matching Service - Main Application
FastAPI application cho module "Chiếc Chuông"
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api.routers import matching
from app.core.database import test_connection
from app.core.config import settings

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle events cho FastAPI app
    """
    # Startup
    logger.info("🚀 Starting AIReFound Matching Service...")
    
    # Test database connection
    if test_connection():
        logger.info("✓ Database connection successful")
    else:
        logger.error("✗ Database connection failed")
    
    logger.info(f"✓ Service running on environment: {settings.SUPABASE_URL}")
    logger.info(f"✓ Similarity threshold: {settings.SIMILARITY_THRESHOLD}")
    logger.info(f"✓ Max candidates: {settings.MAX_CANDIDATES}")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down AIReFound Matching Service...")


# Initialize FastAPI app
app = FastAPI(
    title="AIReFound Matching Service",
    description="""
    Module "Chiếc Chuông" - Hệ thống matching AI cho ứng dụng tìm đồ thất lạc.
    
    ## Features
    - 🔔 Kích hoạt matching tự động (scan history)
    - ⚡ Realtime matching khi có bài FOUND mới
    - 🔄 Retry mechanism cho vector embedding
    - 📊 Vector search với PostgreSQL pgvector
    - 🔔 Notifications cho users
    
    ## Tech Stack
    - FastAPI + Celery + Redis
    - PostgreSQL + pgvector
    - Supabase
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure này theo môi trường thực tế
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(matching.router)


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint"""
    return {
        "service": "AIReFound Matching Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/docs",
            "health": "/api/v1/matching/health",
            "create_request": "POST /api/v1/matching/match-requests",
            "webhook": "POST /api/v1/matching/webhook/new-post"
        }
    }


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return {
        "error": "Internal Server Error",
        "detail": str(exc)
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Development mode
        log_level="info"
    )
