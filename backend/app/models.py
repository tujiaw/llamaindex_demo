from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    uploaded_at: str
    chunks_count: int

class FileInfo(BaseModel):
    file_id: str
    filename: str
    size: int
    uploaded_at: str
    chunks_count: int

class DeleteFileResponse(BaseModel):
    success: bool
    message: str
    deleted_chunks: int

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = []
    file_ids: Optional[List[str]] = None
    user_id: Optional[str] = "default_user"  # 用户ID，用于记忆管理

class ChatResponse(BaseModel):
    response: str
    sources: List[dict]
