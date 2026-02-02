"""
Matching API Router
Định nghĩa các endpoints cho matching functionality
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from uuid import UUID
from typing import List
import logging

from app.core.database import get_db
from app.schemas.matching import (
    CreateMatchRequestSchema,
    WebhookNewPostSchema,
    MatchRequestResponse,
    TaskStatusResponse,
    ErrorResponse
)
from app.worker import scan_history_task, scan_realtime_task
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/matching", tags=["matching"])


# ============= ENDPOINTS =============

@router.post(
    "/match-requests",
    response_model=MatchRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo Match Request (Bấm chuông)",
    description="""
    Kích hoạt tính năng "Chiếc Chuông" - quét toàn bộ bài FOUND để tìm khớp.
    
    Luồng:
    1. Validate lost_post_id (phải là bài LOST, status ACTIVE)
    2. Tạo match_request với status SCANNING
    3. Đẩy task vào Celery queue để xử lý background
    """
)
async def create_match_request(
    payload: CreateMatchRequestSchema,
    db: Session = Depends(get_db)
):
    """
    API endpoint để user bấm chuông (kích hoạt matching)
    """
    try:
        # Bước 1: Validate post
        query = text("""
            SELECT id, user_id, type, status
            FROM posts
            WHERE id = :post_id
        """)
        
        post = db.execute(query, {"post_id": str(payload.lost_post_id)}).fetchone()
        
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        if post.type != 'LOST':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Post must be a LOST post"
            )
        
        if post.status != 'ACTIVE':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Post must be ACTIVE"
            )
        
        # Bước 2: Kiểm tra xem đã có request chưa
        check_query = text("""
            SELECT id, status
            FROM match_requests
            WHERE lost_post_id = :post_id
                AND status = 'SCANNING'
        """)
        
        existing = db.execute(check_query, {"post_id": str(payload.lost_post_id)}).fetchone()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Already have an active match request for this post"
            )
        
        # Bước 3: Tạo match_request
        insert_query = text("""
            INSERT INTO match_requests (lost_post_id, user_id, status)
            VALUES (:lost_post_id, :user_id, 'SCANNING')
            RETURNING id, lost_post_id, user_id, status, created_at
        """)
        
        result = db.execute(insert_query, {
            "lost_post_id": str(payload.lost_post_id),
            "user_id": str(post.user_id)
        })
        
        db.commit()
        
        new_request = result.fetchone()
        
        # Bước 4: Đẩy task vào Celery queue
        task = scan_history_task.apply_async(
            args=[str(payload.lost_post_id), str(new_request.id)],
            queue='matching'
        )
        
        logger.info(
            f"Created match request {new_request.id} for post {payload.lost_post_id}, "
            f"task_id={task.id}"
        )
        
        return MatchRequestResponse(
            request_id=new_request.id,
            lost_post_id=new_request.lost_post_id,
            user_id=new_request.user_id,
            status=new_request.status,
            created_at=new_request.created_at,
            message=f"Match request created successfully. Task ID: {task.id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating match request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/webhook/new-post",
    response_model=TaskStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Webhook cho bài FOUND mới",
    description="""
    Webhook được gọi khi có bài FOUND mới (từ Supabase trigger hoặc service khác).
    
    Luồng:
    1. Nhận new_found_post_id
    2. Đẩy task scan_realtime vào Celery
    3. Task sẽ tự động retry nếu vector chưa có
    """
)
async def webhook_new_found_post(
    payload: WebhookNewPostSchema,
    db: Session = Depends(get_db)
):
    """
    Webhook endpoint khi có bài FOUND mới được tạo
    """
    try:
        # Validate post tồn tại và là FOUND
        query = text("""
            SELECT id, type, status
            FROM posts
            WHERE id = :post_id
        """)
        
        post = db.execute(query, {"post_id": str(payload.new_found_post_id)}).fetchone()
        
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        if post.type != 'FOUND':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Post must be a FOUND post"
            )
        
        # Đẩy task vào queue (không cần validate vector ở đây, để worker xử lý)
        task = scan_realtime_task.apply_async(
            args=[str(payload.new_found_post_id)],
            queue='matching'
        )
        
        logger.info(
            f"Received new FOUND post {payload.new_found_post_id}, "
            f"dispatched task_id={task.id}"
        )
        
        return TaskStatusResponse(
            task_id=task.id,
            status="PENDING",
            message=f"Realtime scan task dispatched for post {payload.new_found_post_id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in webhook: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/match-requests/{request_id}/candidates",
    summary="Lấy danh sách candidates của một request",
    description="Trả về tất cả candidates được tìm thấy cho một match request"
)
async def get_request_candidates(
    request_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Lấy danh sách candidates của một match request
    """
    try:
        query = text("""
            SELECT 
                mc.id,
                mc.request_id,
                mc.found_post_id,
                mc.similarity_score,
                mc.status,
                mc.has_verified_details,
                mc.created_at,
                p.content,
                p.location,
                p.original_url
            FROM match_candidates mc
            JOIN posts p ON p.id = mc.found_post_id
            WHERE mc.request_id = :request_id
            ORDER BY mc.similarity_score DESC
        """)
        
        results = db.execute(query, {"request_id": str(request_id)}).fetchall()
        
        candidates = []
        for row in results:
            candidates.append({
                'id': row.id,
                'request_id': row.request_id,
                'found_post_id': row.found_post_id,
                'similarity_score': row.similarity_score,
                'status': row.status,
                'has_verified_details': row.has_verified_details,
                'created_at': row.created_at,
                'found_post': {
                    'content': row.content,
                    'location': row.location,
                    'original_url': row.original_url
                }
            })
        
        return {
            'request_id': request_id,
            'total_candidates': len(candidates),
            'candidates': candidates
        }
        
    except Exception as e:
        logger.error(f"Error getting candidates: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post(
    "/match-requests/{request_id}/cancel",
    summary="Hủy match request (tắt chuông)",
    description="Chuyển status của match request sang CANCELLED"
)
async def cancel_match_request(
    request_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Hủy một match request (user tắt chuông)
    """
    try:
        # Kiểm tra request tồn tại
        check_query = text("""
            SELECT id, status FROM match_requests
            WHERE id = :request_id
        """)
        
        request = db.execute(check_query, {"request_id": str(request_id)}).fetchone()
        
        if not request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match request not found"
            )
        
        if request.status != 'SCANNING':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel request with status {request.status}"
            )
        
        # Update status
        update_query = text("""
            UPDATE match_requests
            SET status = 'CANCELLED'
            WHERE id = :request_id
            RETURNING id, status
        """)
        
        result = db.execute(update_query, {"request_id": str(request_id)})
        db.commit()
        
        updated = result.fetchone()
        
        logger.info(f"Cancelled match request {request_id}")
        
        return {
            'request_id': updated.id,
            'status': updated.status,
            'message': 'Match request cancelled successfully'
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error cancelling request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/health",
    summary="Health check endpoint",
    description="Kiểm tra tình trạng matching service"
)
async def health_check(db: Session = Depends(get_db)):
    """
    Health check cho matching service
    """
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        
        return {
            'status': 'healthy',
            'service': 'matching',
            'database': 'connected'
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service unhealthy"
        )
