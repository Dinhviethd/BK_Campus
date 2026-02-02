"""
Pydantic Schemas
Định nghĩa các model cho request/response validation
"""
from pydantic import BaseModel, Field, UUID4
from typing import Optional, List
from datetime import datetime
from enum import Enum


class PostType(str, Enum):
    LOST = "LOST"
    FOUND = "FOUND"


class ProcessStatus(str, Enum):
    PROCESSING = "PROCESSING"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    CLOSED = "CLOSED"


class MatchRequestStatus(str, Enum):
    SCANNING = "SCANNING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CandidateStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


# ============= REQUEST SCHEMAS =============

class CreateMatchRequestSchema(BaseModel):
    """Schema cho API tạo match request"""
    lost_post_id: UUID4
    
    class Config:
        json_schema_extra = {
            "example": {
                "lost_post_id": "550e8400-e29b-41d4-a716-446655440000"
            }
        }


class WebhookNewPostSchema(BaseModel):
    """Schema cho webhook khi có bài FOUND mới"""
    new_found_post_id: UUID4
    
    class Config:
        json_schema_extra = {
            "example": {
                "new_found_post_id": "660e8400-e29b-41d4-a716-446655440001"
            }
        }


# ============= RESPONSE SCHEMAS =============

class MatchRequestResponse(BaseModel):
    """Response sau khi tạo match request"""
    request_id: UUID4
    lost_post_id: UUID4
    user_id: UUID4
    status: MatchRequestStatus
    created_at: datetime
    message: str
    
    class Config:
        from_attributes = True


class MatchCandidateResponse(BaseModel):
    """Response cho một candidate"""
    id: UUID4
    request_id: UUID4
    found_post_id: UUID4
    similarity_score: float
    status: CandidateStatus
    created_at: datetime
    
    class Config:
        from_attributes = True


class MatchResultResponse(BaseModel):
    """Response chứa danh sách candidates"""
    request_id: UUID4
    total_candidates: int
    candidates: List[MatchCandidateResponse]
    
    class Config:
        json_schema_extra = {
            "example": {
                "request_id": "550e8400-e29b-41d4-a716-446655440000",
                "total_candidates": 5,
                "candidates": []
            }
        }


class TaskStatusResponse(BaseModel):
    """Response cho task status"""
    task_id: str
    status: str
    message: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "abc-123-def-456",
                "status": "PENDING",
                "message": "Task is being processed"
            }
        }


class ErrorResponse(BaseModel):
    """Schema cho error response"""
    error: str
    detail: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "error": "NOT_FOUND",
                "detail": "Post not found or not a LOST post"
            }
        }
