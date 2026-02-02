"""
Celery Worker Tasks
Xử lý matching tasks với retry mechanism cho vector checking
"""
from celery import Task
from celery.exceptions import Retry
from app.core.celery_app import celery_app
from app.core.database import get_db_session
from app.services.matching_service import MatchingService
from app.services.notification_service import NotificationService
from app.core.config import settings
from sqlalchemy import text
from uuid import UUID
import logging
import time

logger = logging.getLogger(__name__)


class VectorCheckTask(Task):
    """
    Custom Task class với retry logic cho vector checking
    """
    autoretry_for = (Exception,)
    retry_kwargs = {
        'max_retries': settings.VECTOR_CHECK_MAX_RETRIES,
        'countdown': settings.VECTOR_CHECK_RETRY_DELAY
    }
    retry_backoff = True
    retry_backoff_max = 30  # max 30 seconds
    retry_jitter = True


# ============= TASK 1: SCAN HISTORY (Khi user bấm chuông) =============

@celery_app.task(name='app.worker.scan_history_task', bind=True)
def scan_history_task(self, lost_post_id: str, request_id: str):
    """
    Task quét toàn bộ bài FOUND trong DB để tìm khớp với bài LOST
    
    Luồng:
    1. Lấy vector của bài LOST
    2. Tìm các bài FOUND khớp (Vector Search)
    3. Insert kết quả vào match_candidates
    
    Args:
        lost_post_id: UUID của bài LOST (string format)
        request_id: UUID của match_request (string format)
    """
    logger.info(f"[SCAN_HISTORY] Starting for lost_post={lost_post_id}, request={request_id}")
    
    try:
        with get_db_session() as db:
            matching_service = MatchingService(db)
            
            # Bước 1: Kiểm tra vector đã có chưa
            lost_post_uuid = UUID(lost_post_id)
            if not matching_service.check_vector_exists(lost_post_uuid):
                logger.warning(f"[SCAN_HISTORY] No vector found for {lost_post_id}, waiting for embedding service...")
                
                # Retry sau 5 giây
                raise self.retry(countdown=settings.VECTOR_CHECK_RETRY_DELAY)
            
            # Bước 2: Thực hiện vector search
            logger.info(f"[SCAN_HISTORY] Vector found, starting matching...")
            
            matching_results = matching_service.find_matching_found_posts(
                lost_post_id=lost_post_uuid,
                limit=settings.MAX_CANDIDATES
            )
            
            # Bước 3: Insert candidates vào DB
            if matching_results:
                candidates = [
                    {
                        'found_post_id': result['found_post_id'],
                        'similarity_score': result['similarity_score']
                    }
                    for result in matching_results
                ]
                
                request_uuid = UUID(request_id)
                count = matching_service.create_match_candidates(
                    request_id=request_uuid,
                    candidates=candidates
                )
                
                # Cập nhật last_scan_at
                matching_service.update_request_last_scan(request_uuid)
                
                logger.info(f"[SCAN_HISTORY] ✓ Created {count} candidates for request {request_id}")
                
                return {
                    'status': 'SUCCESS',
                    'request_id': request_id,
                    'candidates_count': count
                }
            else:
                logger.info(f"[SCAN_HISTORY] No matching found posts for {lost_post_id}")
                
                # Vẫn cập nhật last_scan_at
                matching_service.update_request_last_scan(UUID(request_id))
                
                return {
                    'status': 'SUCCESS',
                    'request_id': request_id,
                    'candidates_count': 0
                }
                
    except Retry:
        raise  # Re-raise retry exception
    
    except Exception as e:
        logger.error(f"[SCAN_HISTORY] Error: {e}", exc_info=True)
        
        # Nếu đã retry quá số lần cho phép
        if self.request.retries >= settings.VECTOR_CHECK_MAX_RETRIES:
            logger.error(f"[SCAN_HISTORY] Max retries reached for {lost_post_id}")
            
            # Cập nhật request status thành CANCELLED hoặc ghi log
            with get_db_session() as db:
                query = text("""
                    UPDATE match_requests
                    SET status = 'CANCELLED'
                    WHERE id = :request_id
                """)
                db.execute(query, {"request_id": request_id})
                db.commit()
            
            return {
                'status': 'FAILED',
                'request_id': request_id,
                'error': 'Vector not available after max retries'
            }
        
        raise


# ============= TASK 2: SCAN REALTIME (Khi có bài FOUND mới) =============

@celery_app.task(
    name='app.worker.scan_realtime_task',
    bind=True,
    base=VectorCheckTask  # Sử dụng custom task class
)
def scan_realtime_task(self, new_found_post_id: str):
    """
    Task quét realtime khi có bài FOUND mới
    
    Luồng:
    1. Kiểm tra vector của bài FOUND mới (có retry mechanism)
    2. Tìm các match_requests đang SCANNING
    3. Tính similarity với từng LOST post
    4. Insert candidates + notifications
    
    Args:
        new_found_post_id: UUID của bài FOUND mới (string format)
    """
    logger.info(f"[SCAN_REALTIME] Starting for found_post={new_found_post_id}")
    
    try:
        with get_db_session() as db:
            matching_service = MatchingService(db)
            notification_service = NotificationService(db)
            
            # Bước 1: Kiểm tra vector (CRITICAL - có retry)
            found_post_uuid = UUID(new_found_post_id)
            
            if not matching_service.check_vector_exists(found_post_uuid):
                logger.warning(
                    f"[SCAN_REALTIME] No vector for {new_found_post_id} "
                    f"(retry {self.request.retries + 1}/{settings.VECTOR_CHECK_MAX_RETRIES})"
                )
                
                # Retry sau X giây (countdown được config trong VectorCheckTask)
                raise self.retry(countdown=settings.VECTOR_CHECK_RETRY_DELAY)
            
            logger.info(f"[SCAN_REALTIME] Vector found for {new_found_post_id}, starting matching...")
            
            # Bước 2: Tìm các LOST requests đang SCANNING
            matching_results = matching_service.find_matching_lost_requests(
                found_post_id=found_post_uuid,
                limit=settings.MAX_CANDIDATES
            )
            
            if not matching_results:
                logger.info(f"[SCAN_REALTIME] No matching LOST requests for {new_found_post_id}")
                return {
                    'status': 'SUCCESS',
                    'found_post_id': new_found_post_id,
                    'matches_count': 0
                }
            
            # Bước 3: Insert candidates và notifications
            total_candidates = 0
            total_notifications = 0
            
            for result in matching_results:
                try:
                    # Insert candidate
                    candidates = [{
                        'found_post_id': found_post_uuid,
                        'similarity_score': result['similarity_score']
                    }]
                    
                    count = matching_service.create_match_candidates(
                        request_id=result['request_id'],
                        candidates=candidates
                    )
                    total_candidates += count
                    
                    # Lấy candidate_id vừa tạo để gửi notification
                    query = text("""
                        SELECT id FROM match_candidates
                        WHERE request_id = :request_id
                            AND found_post_id = :found_post_id
                        ORDER BY created_at DESC
                        LIMIT 1
                    """)
                    candidate_result = db.execute(query, {
                        "request_id": str(result['request_id']),
                        "found_post_id": str(found_post_uuid)
                    }).fetchone()
                    
                    if candidate_result:
                        candidate_id = candidate_result[0]
                        
                        # Tạo notification
                        success = notification_service.create_system_match_notification(
                            user_id=result['user_id'],
                            candidate_id=candidate_id,
                            similarity_score=result['similarity_score']
                        )
                        
                        if success:
                            total_notifications += 1
                    
                    # Cập nhật last_scan_at
                    matching_service.update_request_last_scan(result['request_id'])
                    
                except Exception as e:
                    logger.error(f"[SCAN_REALTIME] Error processing request {result['request_id']}: {e}")
                    continue
            
            logger.info(
                f"[SCAN_REALTIME] ✓ Created {total_candidates} candidates "
                f"and {total_notifications} notifications for {new_found_post_id}"
            )
            
            return {
                'status': 'SUCCESS',
                'found_post_id': new_found_post_id,
                'matches_count': len(matching_results),
                'candidates_created': total_candidates,
                'notifications_sent': total_notifications
            }
    
    except Retry:
        raise  # Re-raise retry exception
    
    except Exception as e:
        logger.error(f"[SCAN_REALTIME] Error: {e}", exc_info=True)
        
        # Nếu đã retry quá số lần
        if self.request.retries >= settings.VECTOR_CHECK_MAX_RETRIES:
            logger.error(
                f"[SCAN_REALTIME] Max retries reached for {new_found_post_id}. "
                "Vector may not be available."
            )
            
            return {
                'status': 'FAILED',
                'found_post_id': new_found_post_id,
                'error': 'Vector not available after max retries'
            }
        
        raise


# ============= HELPER TASKS =============

@celery_app.task(name='app.worker.cleanup_old_candidates')
def cleanup_old_candidates():
    """
    Task dọn dẹp các candidates cũ (chạy định kỳ)
    Xóa candidates PENDING quá 30 ngày
    """
    try:
        with get_db_session() as db:
            query = text("""
                DELETE FROM match_candidates
                WHERE status = 'PENDING'
                    AND created_at < NOW() - INTERVAL '30 days'
                RETURNING id
            """)
            
            result = db.execute(query)
            db.commit()
            
            count = result.rowcount
            logger.info(f"[CLEANUP] Deleted {count} old candidates")
            
            return {
                'status': 'SUCCESS',
                'deleted_count': count
            }
            
    except Exception as e:
        logger.error(f"[CLEANUP] Error: {e}")
        return {
            'status': 'FAILED',
            'error': str(e)
        }


@celery_app.task(name='app.worker.test_vector_check')
def test_vector_check(post_id: str):
    """
    Task test để kiểm tra vector checking
    """
    try:
        with get_db_session() as db:
            matching_service = MatchingService(db)
            
            post_uuid = UUID(post_id)
            has_vector = matching_service.check_vector_exists(post_uuid)
            
            logger.info(f"[TEST] Post {post_id} has_vector={has_vector}")
            
            if has_vector:
                vectors = matching_service.get_post_vectors(post_uuid)
                return {
                    'status': 'SUCCESS',
                    'post_id': post_id,
                    'has_vector': True,
                    'has_content_vec': vectors['content_embedding'] is not None,
                    'image_count': len(vectors['image_embeddings'])
                }
            else:
                return {
                    'status': 'SUCCESS',
                    'post_id': post_id,
                    'has_vector': False
                }
                
    except Exception as e:
        logger.error(f"[TEST] Error: {e}")
        return {
            'status': 'FAILED',
            'error': str(e)
        }
