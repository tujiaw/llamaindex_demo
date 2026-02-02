from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import os
import uuid

from ..models import FileUploadResponse, FileInfo, DeleteFileResponse
from ..services.vector_store import vector_store_service
from ..services.document_processor import document_processor
from ..config import settings

router = APIRouter(prefix="/files", tags=["files"])

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    上传文件并向量化
    """
    # 检查文件类型
    if not document_processor.is_supported_file(file.filename, settings.ALLOWED_EXTENSIONS):
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型。支持的类型: {settings.ALLOWED_EXTENSIONS}"
        )
    
    # 检查文件大小
    file.file.seek(0, 2)  # 移到文件末尾
    file_size = file.file.tell()
    file.file.seek(0)  # 回到文件开头
    
    if file_size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件太大。最大允许 {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # 生成唯一文件 ID
    file_id = str(uuid.uuid4())
    
    # 保存文件
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file_id)
    
    try:
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 处理文档
        documents = await document_processor.process_file(file_path)
        
        if not documents:
            raise HTTPException(status_code=400, detail="无法从文件中提取内容")
        
        # 添加到向量存储
        chunks_count = await vector_store_service.add_documents(
            file_id=file_id,
            filename=file.filename,
            documents=documents,
            file_size=file_size
        )
        
        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            size=file_size,
            uploaded_at=vector_store_service.file_metadata[file_id]["uploaded_at"],
            chunks_count=chunks_count
        )
    
    except Exception as e:
        # 清理文件
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"处理文件时出错: {str(e)}")

@router.get("/list", response_model=List[FileInfo])
async def list_files():
    """
    获取所有已上传的文件
    """
    files = vector_store_service.get_all_files()
    return [FileInfo(**file) for file in files]

@router.delete("/{file_id}", response_model=DeleteFileResponse)
async def delete_file(file_id: str):
    """
    删除文件及其向量
    """
    deleted_chunks = await vector_store_service.delete_file(file_id)
    
    if deleted_chunks == 0:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    return DeleteFileResponse(
        success=True,
        message=f"成功删除文件及其 {deleted_chunks} 个向量块",
        deleted_chunks=deleted_chunks
    )
