"""
Notification Service
Xử lý logic tạo và gửi notifications
"""
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Dict
from uuid import UUID
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Service xử lý notifications"""
    
    def __init__(self, db: Session):
        self.db = db
    
    
    def create_system_match_notification(
        self,
        user_id: UUID,
        candidate_id: UUID,
        similarity_score: float
    ) -> bool:
        """
        Tạo notification khi AI tìm thấy match
        Type: SYSTEM_MATCH
        
        Args:
            user_id: ID của user nhận thông báo
            candidate_id: ID của match candidate
            similarity_score: Điểm tương đồng
            
        Returns:
            True nếu tạo thành công
        """
        try:
            title = "🔔 Tìm thấy đồ khớp!"
            message = f"AI đã phát hiện một bài đăng có độ tương đồng {similarity_score*100:.1f}%. Hãy kiểm tra ngay!"
            
            query = text("""
                INSERT INTO notifications (
                    user_id,
                    type,
                    title,
                    message,
                    reference_id,
                    reference_type
                )
                VALUES (
                    :user_id,
                    'SYSTEM_MATCH',
                    :title,
                    :message,
                    :candidate_id,
                    'CANDIDATE'
                )
                RETURNING id
            """)
            
            result = self.db.execute(query, {
                "user_id": str(user_id),
                "title": title,
                "message": message,
                "candidate_id": str(candidate_id)
            })
            
            self.db.commit()
            
            noti_id = result.fetchone()[0]
            logger.info(f"Created notification {noti_id} for user {user_id}")
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating notification: {e}")
            return False
    
    
    def create_batch_notifications(
        self,
        notifications: List[Dict]
    ) -> int:
        """
        Tạo nhiều notifications cùng lúc
        
        Args:
            notifications: List of {
                'user_id': UUID,
                'candidate_id': UUID,
                'similarity_score': float
            }
            
        Returns:
            Số lượng notifications đã tạo
        """
        if not notifications:
            return 0
        
        try:
            values = []
            for noti in notifications:
                title = "🔔 Tìm thấy đồ khớp!"
                message = f"AI đã phát hiện một bài đăng có độ tương đồng {noti['similarity_score']*100:.1f}%. Hãy kiểm tra ngay!"
                
                values.append(
                    f"('{noti['user_id']}', 'SYSTEM_MATCH', '{title}', '{message}', '{noti['candidate_id']}', 'CANDIDATE')"
                )
            
            query = text(f"""
                INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
                VALUES {', '.join(values)}
                RETURNING id
            """)
            
            result = self.db.execute(query)
            self.db.commit()
            
            count = result.rowcount
            logger.info(f"Created {count} batch notifications")
            return count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating batch notifications: {e}")
            return 0
    
    
    def mark_as_read(self, notification_id: UUID) -> bool:
        """Đánh dấu notification đã đọc"""
        try:
            query = text("""
                UPDATE notifications
                SET is_read = true
                WHERE id = :noti_id
            """)
            
            self.db.execute(query, {"noti_id": str(notification_id)})
            self.db.commit()
            
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error marking notification as read: {e}")
            return False
    
    
    def get_user_notifications(
        self,
        user_id: UUID,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """
        Lấy danh sách notifications của user
        
        Args:
            user_id: ID của user
            unread_only: Chỉ lấy notifications chưa đọc
            limit: Số lượng tối đa
            
        Returns:
            List of notification dicts
        """
        try:
            where_clause = "user_id = :user_id"
            if unread_only:
                where_clause += " AND is_read = false"
            
            query = text(f"""
                SELECT 
                    id,
                    type,
                    title,
                    message,
                    reference_id,
                    reference_type,
                    is_read,
                    created_at
                FROM notifications
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT :limit
            """)
            
            results = self.db.execute(query, {
                "user_id": str(user_id),
                "limit": limit
            }).fetchall()
            
            notifications = []
            for row in results:
                notifications.append({
                    'id': row.id,
                    'type': row.type,
                    'title': row.title,
                    'message': row.message,
                    'reference_id': row.reference_id,
                    'reference_type': row.reference_type,
                    'is_read': row.is_read,
                    'created_at': row.created_at
                })
            
            return notifications
            
        except Exception as e:
            logger.error(f"Error getting notifications: {e}")
            return []
