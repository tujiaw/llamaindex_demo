from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime


class FileUploadResponse(BaseModel):
    """文件上传响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    file_id: str = Field(..., description="文件唯一标识符")
    filename: str = Field(..., description="文件名")
    size: int = Field(..., ge=0, description="文件大小（字节）")
    uploaded_at: str = Field(..., description="上传时间")
    chunks_count: int = Field(..., ge=0, description="文档分块数量")


class FileInfo(BaseModel):
    """文件信息模型"""
    model_config = ConfigDict(from_attributes=True)
    
    file_id: str = Field(..., description="文件唯一标识符")
    filename: str = Field(..., description="文件名")
    size: int = Field(..., ge=0, description="文件大小（字节）")
    uploaded_at: str = Field(..., description="上传时间")
    chunks_count: int = Field(..., ge=0, description="文档分块数量")


class DeleteFileResponse(BaseModel):
    """删除文件响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    success: bool = Field(..., description="是否成功删除")
    message: str = Field(..., description="响应消息")
    deleted_chunks: int = Field(..., ge=0, description="删除的文档块数量")


class ChatMessage(BaseModel):
    """聊天消息模型"""
    model_config = ConfigDict(from_attributes=True)
    
    role: str = Field(..., description="角色：user 或 assistant")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    """聊天请求模型"""
    model_config = ConfigDict(from_attributes=True)
    
    message: str = Field(..., min_length=1, description="用户消息")
    chat_history: List[ChatMessage] = Field(default_factory=list, description="聊天历史")
    file_ids: Optional[List[str]] = Field(default=None, description="关联的文件ID列表")
    user_id: str = Field(default="default_user", description="用户ID，用于记忆管理")


class ChatResponse(BaseModel):
    """聊天响应模型"""
    model_config = ConfigDict(from_attributes=True)
    
    response: str = Field(..., description="助手回复")
    sources: List[dict] = Field(default_factory=list, description="引用的源文档列表")
