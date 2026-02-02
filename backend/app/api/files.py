from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import os
import uuid

from ..models import FileUploadResponse, FileInfo, DeleteFileResponse
from ..services.vector_store import vector_store_service
from ..services.document_processor import document_processor
from ..config import settings
from ..logger import logger

router = APIRouter(prefix="/files", tags=["files"])

@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """
    上传文件并向量化
    """
    logger.info(f"收到文件上传请求: {file.filename}")
    
    # 检查文件类型
    if not document_processor.is_supported_file(file.filename):
        logger.warning(f"文件类型不支持: {file.filename}")
        supported_exts = document_processor.get_all_supported_extensions()
        raise HTTPException(
            status_code=400,
            detail=f"不支持的文件类型。支持的类型: {supported_exts}"
        )
    
    # 检查文件大小
    file.file.seek(0, 2)  # 移到文件末尾
    file_size = file.file.tell()
    file.file.seek(0)  # 回到文件开头
    
    if file_size > settings.MAX_FILE_SIZE:
        logger.warning(f"文件大小超过限制: {file.filename}, size: {file_size}")
        raise HTTPException(
            status_code=400,
            detail=f"文件太大。最大允许 {settings.MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    
    # 生成唯一文件 ID
    file_id = str(uuid.uuid4())
    
    # 保存文件（保留原始扩展名）
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1].lower()
    file_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}{file_ext}")
    
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
        
        logger.info(f"文件处理成功: {file.filename} (ID: {file_id}), chunks: {chunks_count}")

        # 获取刚才保存的元数据（为了返回一致的时间格式）
        # 这里直接构造返回，因为 add_documents 已经是异步且我们知道保存了什么
        import datetime
        uploaded_at = datetime.datetime.now().isoformat()
        
        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            size=file_size,
            uploaded_at=uploaded_at,
            chunks_count=chunks_count
        )
    
    except Exception as e:
        logger.error(f"处理文件上传时发生异常: {str(e)}", exc_info=True)
        # 清理文件
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"处理文件时出错: {str(e)}")

@router.get("/list", response_model=List[FileInfo])
async def list_files():
    """
    获取所有已上传的文件
    """
    logger.info("请求获取文件列表")
    files = await vector_store_service.get_all_files()
    return [FileInfo(**file) for file in files]

@router.delete("/{file_id}", response_model=DeleteFileResponse)
async def delete_file(file_id: str):
    """
    删除文件及其向量
    """
    logger.info(f"请求删除文件: {file_id}")
    deleted_chunks = await vector_store_service.delete_file(file_id)
    
    if deleted_chunks == 0:
        logger.warning(f"删除失败，文件不存在: {file_id}")
        raise HTTPException(status_code=404, detail="文件不存在")
    
    logger.info(f"成功删除文件: {file_id}")
    return DeleteFileResponse(
        success=True,
        message=f"成功删除文件及其 {deleted_chunks} 个向量块",
        deleted_chunks=deleted_chunks
    )
