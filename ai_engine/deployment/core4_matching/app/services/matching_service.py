"""
Matching Service
Chứa các hàm thực hiện Vector Search và Matching Logic
"""
from sqlalchemy.orm import Session
from sqlalchemy import text, and_
from typing import List, Dict, Optional, Tuple
from uuid import UUID
import logging
import numpy as np
from app.core.config import settings

logger = logging.getLogger(__name__)


class MatchingService:
    """Service xử lý logic matching giữa LOST và FOUND posts"""
    
    def __init__(self, db: Session):
        self.db = db
        
    # ============= VECTOR RETRIEVAL =============
    
    def get_post_vectors(self, post_id: UUID) -> Optional[Dict]:
        """
        Lấy vector embedding của một post (bao gồm content và images)
        
        Returns:
            {
                'content_embedding': List[float] hoặc None,
                'image_embeddings': List[List[float]]  # Danh sách vector của các ảnh
            }
        """
        try:
            # Query lấy content embedding
            query_content = text("""
                SELECT content_embedding::text as embedding
                FROM posts
                WHERE id = :post_id
            """)
            result = self.db.execute(query_content, {"post_id": str(post_id)}).fetchone()
            
            content_embedding = None
            if result and result.embedding:
                # Parse vector string "[0.1, 0.2, ...]" thành list
                content_embedding = self._parse_vector_string(result.embedding)
            
            # Query lấy image embeddings
            query_images = text("""
                SELECT embedding::text as embedding
                FROM post_images
                WHERE post_id = :post_id AND embedding IS NOT NULL
            """)
            image_results = self.db.execute(query_images, {"post_id": str(post_id)}).fetchall()
            
            image_embeddings = []
            for row in image_results:
                if row.embedding:
                    img_vec = self._parse_vector_string(row.embedding)
                    if img_vec:
                        image_embeddings.append(img_vec)
            
            logger.info(f"Retrieved vectors for post {post_id}: content={content_embedding is not None}, images={len(image_embeddings)}")
            
            return {
                'content_embedding': content_embedding,
                'image_embeddings': image_embeddings
            }
            
        except Exception as e:
            logger.error(f"Error getting vectors for post {post_id}: {e}")
            return None
    
    
    def check_vector_exists(self, post_id: UUID) -> bool:
        """
        Kiểm tra xem post đã có vector embedding chưa
        Quan trọng cho retry mechanism
        """
        try:
            query = text("""
                SELECT 
                    content_embedding IS NOT NULL as has_content_vec,
                    EXISTS(
                        SELECT 1 FROM post_images 
                        WHERE post_id = :post_id AND embedding IS NOT NULL
                    ) as has_image_vec
                FROM posts
                WHERE id = :post_id
            """)
            result = self.db.execute(query, {"post_id": str(post_id)}).fetchone()
            
            if not result:
                return False
                
            # Coi như có vector nếu có ít nhất 1 trong 2: content hoặc image
            has_vector = result.has_content_vec or result.has_image_vec
            
            logger.info(f"Vector check for {post_id}: content={result.has_content_vec}, image={result.has_image_vec}")
            return has_vector
            
        except Exception as e:
            logger.error(f"Error checking vector for post {post_id}: {e}")
            return False
    
    
    # ============= VECTOR SEARCH =============
    
    def find_matching_found_posts(
        self, 
        lost_post_id: UUID,
        limit: int = None
    ) -> List[Dict]:
        """
        Tìm các bài FOUND khớp với một bài LOST
        Sử dụng Vector Search với công thức:
        Score = w1*Sim(Img, Img) + w2*Sim(Text, Img) + w3*KeywordMatch
        
        Args:
            lost_post_id: ID của bài LOST
            limit: Số lượng kết quả tối đa
            
        Returns:
            List of {
                'found_post_id': UUID,
                'similarity_score': float,
                'content': str,
                'location': str,
                'original_url': str
            }
        """
        if limit is None:
            limit = settings.MAX_CANDIDATES
            
        # Lấy vectors của bài LOST
        lost_vectors = self.get_post_vectors(lost_post_id)
        if not lost_vectors:
            logger.warning(f"No vectors found for LOST post {lost_post_id}")
            return []
        
        lost_content_vec = lost_vectors['content_embedding']
        lost_image_vecs = lost_vectors['image_embeddings']
        
        # Nếu không có vector nào, return rỗng
        if not lost_content_vec and not lost_image_vecs:
            logger.warning(f"LOST post {lost_post_id} has no vectors")
            return []
        
        # Query tìm các bài FOUND đang ACTIVE
        results = []
        
        try:
            # Build query động dựa trên vectors có sẵn
            query = self._build_matching_query(
                lost_content_vec=lost_content_vec,
                lost_image_vecs=lost_image_vecs,
                limit=limit
            )
            
            found_posts = self.db.execute(query).fetchall()
            
            # Tính similarity score cho từng kết quả
            for row in found_posts:
                score = self._calculate_combined_score(
                    lost_content_vec=lost_content_vec,
                    lost_image_vecs=lost_image_vecs,
                    found_content_vec=self._parse_vector_string(row.content_embedding) if row.content_embedding else None,
                    found_image_vecs=self._get_found_post_image_vectors(row.id)
                )
                
                # Chỉ lấy những kết quả vượt threshold
                if score >= settings.SIMILARITY_THRESHOLD:
                    results.append({
                        'found_post_id': row.id,
                        'similarity_score': score,
                        'content': row.content,
                        'location': row.location,
                        'original_url': row.original_url
                    })
            
            # Sort theo score giảm dần
            results.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            logger.info(f"Found {len(results)} matching FOUND posts for LOST {lost_post_id}")
            return results[:limit]
            
        except Exception as e:
            logger.error(f"Error finding matching posts: {e}")
            return []
    
    
    def find_matching_lost_requests(
        self, 
        found_post_id: UUID,
        limit: int = None
    ) -> List[Dict]:
        """
        Tìm các bài LOST (đang có match_request SCANNING) khớp với một bài FOUND mới
        Dùng cho Realtime Scan
        
        Args:
            found_post_id: ID của bài FOUND mới
            limit: Số lượng kết quả tối đa
            
        Returns:
            List of {
                'request_id': UUID,
                'lost_post_id': UUID,
                'user_id': UUID,
                'similarity_score': float
            }
        """
        if limit is None:
            limit = settings.MAX_CANDIDATES
            
        # Lấy vectors của bài FOUND
        found_vectors = self.get_post_vectors(found_post_id)
        if not found_vectors:
            logger.warning(f"No vectors found for FOUND post {found_post_id}")
            return []
        
        found_content_vec = found_vectors['content_embedding']
        found_image_vecs = found_vectors['image_embeddings']
        
        if not found_content_vec and not found_image_vecs:
            logger.warning(f"FOUND post {found_post_id} has no vectors")
            return []
        
        results = []
        
        try:
            # Query lấy các LOST posts đang có match_request SCANNING
            query = text("""
                SELECT 
                    mr.id as request_id,
                    mr.lost_post_id,
                    mr.user_id,
                    p.content_embedding::text as content_embedding,
                    p.content,
                    p.location
                FROM match_requests mr
                JOIN posts p ON p.id = mr.lost_post_id
                WHERE mr.status = 'SCANNING'
                    AND p.status = 'ACTIVE'
                    AND p.type = 'LOST'
            """)
            
            lost_requests = self.db.execute(query).fetchall()
            
            # Tính similarity cho từng request
            for row in lost_requests:
                lost_content_vec = self._parse_vector_string(row.content_embedding) if row.content_embedding else None
                lost_image_vecs = self._get_found_post_image_vectors(row.lost_post_id)
                
                score = self._calculate_combined_score(
                    lost_content_vec=lost_content_vec,
                    lost_image_vecs=lost_image_vecs,
                    found_content_vec=found_content_vec,
                    found_image_vecs=found_image_vecs
                )
                
                if score >= settings.SIMILARITY_THRESHOLD:
                    results.append({
                        'request_id': row.request_id,
                        'lost_post_id': row.lost_post_id,
                        'user_id': row.user_id,
                        'similarity_score': score
                    })
            
            results.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            logger.info(f"Found {len(results)} matching LOST requests for FOUND {found_post_id}")
            return results[:limit]
            
        except Exception as e:
            logger.error(f"Error finding matching lost requests: {e}")
            return []
    
    
    # ============= HELPER METHODS =============
    
    def _build_matching_query(
        self,
        lost_content_vec: Optional[List[float]],
        lost_image_vecs: List[List[float]],
        limit: int
    ) -> text:
        """
        Build SQL query động dựa trên vectors có sẵn
        Sử dụng pgvector operator <=> cho Cosine Distance
        """
        # Chuyển vector thành string format PostgreSQL
        conditions = []
        
        if lost_content_vec:
            vec_str = self._vector_to_pg_string(lost_content_vec)
            conditions.append(f"content_embedding <=> '{vec_str}'::vector < 0.5")  # cosine distance < 0.5
        
        where_clause = " AND ".join(conditions) if conditions else "TRUE"
        
        query_str = f"""
            SELECT 
                id,
                content,
                location,
                original_url,
                content_embedding::text as content_embedding
            FROM posts
            WHERE type = 'FOUND'
                AND status = 'ACTIVE'
                AND ({where_clause})
            ORDER BY 
                CASE 
                    WHEN content_embedding IS NOT NULL THEN content_embedding <=> '{self._vector_to_pg_string(lost_content_vec) if lost_content_vec else "[0]*512"}'::vector
                    ELSE 1
                END
            LIMIT {limit * 3}
        """
        
        return text(query_str)
    
    
    def _get_found_post_image_vectors(self, post_id: UUID) -> List[List[float]]:
        """Lấy tất cả image vectors của một post"""
        try:
            query = text("""
                SELECT embedding::text as embedding
                FROM post_images
                WHERE post_id = :post_id AND embedding IS NOT NULL
            """)
            results = self.db.execute(query, {"post_id": str(post_id)}).fetchall()
            
            vectors = []
            for row in results:
                if row.embedding:
                    vec = self._parse_vector_string(row.embedding)
                    if vec:
                        vectors.append(vec)
            return vectors
        except Exception as e:
            logger.error(f"Error getting image vectors for {post_id}: {e}")
            return []
    
    
    def _calculate_combined_score(
        self,
        lost_content_vec: Optional[List[float]],
        lost_image_vecs: List[List[float]],
        found_content_vec: Optional[List[float]],
        found_image_vecs: List[List[float]]
    ) -> float:
        """
        Tính similarity score theo công thức:
        Score = w1*Sim(Img, Img) + w2*Sim(Text, Img) + w3*KeywordMatch
        
        Trong đó:
        - w1, w2, w3 được config trong settings
        - Sim = 1 - cosine_distance (để score cao hơn = giống hơn)
        """
        score = 0.0
        weights_sum = 0.0
        
        # 1. Image-to-Image Similarity
        if lost_image_vecs and found_image_vecs:
            img_sim = self._calculate_image_similarity(lost_image_vecs, found_image_vecs)
            score += settings.WEIGHT_IMAGE_IMAGE * img_sim
            weights_sum += settings.WEIGHT_IMAGE_IMAGE
        
        # 2. Text-to-Image Cross Similarity
        if lost_content_vec and found_image_vecs:
            text_img_sim = self._calculate_text_image_similarity(lost_content_vec, found_image_vecs)
            score += settings.WEIGHT_TEXT_IMAGE * text_img_sim
            weights_sum += settings.WEIGHT_TEXT_IMAGE
        
        # 3. Keyword Match (simplified - chỉ so sánh content embeddings)
        if lost_content_vec and found_content_vec:
            keyword_sim = self._cosine_similarity(lost_content_vec, found_content_vec)
            score += settings.WEIGHT_KEYWORD_MATCH * keyword_sim
            weights_sum += settings.WEIGHT_KEYWORD_MATCH
        
        # Normalize score
        if weights_sum > 0:
            score = score / weights_sum
        
        return score
    
    
    def _calculate_image_similarity(
        self,
        lost_images: List[List[float]],
        found_images: List[List[float]]
    ) -> float:
        """Tính similarity giữa 2 tập ảnh (lấy max similarity)"""
        max_sim = 0.0
        
        for lost_img in lost_images:
            for found_img in found_images:
                sim = self._cosine_similarity(lost_img, found_img)
                max_sim = max(max_sim, sim)
        
        return max_sim
    
    
    def _calculate_text_image_similarity(
        self,
        text_vec: List[float],
        image_vecs: List[List[float]]
    ) -> float:
        """Tính similarity giữa text và tập ảnh (lấy max)"""
        max_sim = 0.0
        
        for img_vec in image_vecs:
            sim = self._cosine_similarity(text_vec, img_vec)
            max_sim = max(max_sim, sim)
        
        return max_sim
    
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Tính Cosine Similarity giữa 2 vectors
        Similarity = 1 - Cosine Distance
        """
        try:
            v1 = np.array(vec1)
            v2 = np.array(vec2)
            
            dot_product = np.dot(v1, v2)
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            cosine_sim = dot_product / (norm1 * norm2)
            return float(cosine_sim)
            
        except Exception as e:
            logger.error(f"Error calculating cosine similarity: {e}")
            return 0.0
    
    
    def _parse_vector_string(self, vec_str: str) -> Optional[List[float]]:
        """
        Parse vector string từ PostgreSQL format "[0.1, 0.2, ...]" thành list
        """
        try:
            if not vec_str:
                return None
            
            # Remove brackets and split
            vec_str = vec_str.strip('[]')
            values = [float(x.strip()) for x in vec_str.split(',')]
            return values
        except Exception as e:
            logger.error(f"Error parsing vector string: {e}")
            return None
    
    
    def _vector_to_pg_string(self, vec: List[float]) -> str:
        """Chuyển list vector thành PostgreSQL vector string"""
        return '[' + ','.join(map(str, vec)) + ']'
    
    
    # ============= DATABASE OPERATIONS =============
    
    def create_match_candidates(
        self,
        request_id: UUID,
        candidates: List[Dict]
    ) -> int:
        """
        Insert batch candidates vào database
        
        Args:
            request_id: ID của match request
            candidates: List of {'found_post_id': UUID, 'similarity_score': float}
            
        Returns:
            Số lượng candidates đã insert
        """
        if not candidates:
            return 0
        
        try:
            # Build bulk insert query
            values = []
            for candidate in candidates:
                values.append(
                    f"('{request_id}', '{candidate['found_post_id']}', {candidate['similarity_score']})"
                )
            
            query = text(f"""
                INSERT INTO match_candidates (request_id, found_post_id, similarity_score)
                VALUES {', '.join(values)}
                RETURNING id
            """)
            
            result = self.db.execute(query)
            self.db.commit()
            
            count = result.rowcount
            logger.info(f"Created {count} match candidates for request {request_id}")
            return count
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating match candidates: {e}")
            raise
    
    
    def update_request_last_scan(self, request_id: UUID):
        """Cập nhật last_scan_at cho match request"""
        try:
            query = text("""
                UPDATE match_requests
                SET last_scan_at = NOW()
                WHERE id = :request_id
            """)
            self.db.execute(query, {"request_id": str(request_id)})
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating last_scan for {request_id}: {e}")
