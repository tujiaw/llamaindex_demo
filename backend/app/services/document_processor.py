from llama_index.core import SimpleDirectoryReader, Document
from typing import List
import os
import tempfile
import shutil

class DocumentProcessor:
    """文档处理器 - 负责加载和处理各种格式的文档"""
    
    @staticmethod
    async def process_file(file_path: str) -> List[Document]:
        """
        处理单个文件，返回文档列表
        
        Args:
            file_path: 文件路径
            
        Returns:
            文档列表
        """
        # 创建临时目录
        temp_dir = tempfile.mkdtemp()
        
        try:
            # 复制文件到临时目录
            filename = os.path.basename(file_path)
            temp_file_path = os.path.join(temp_dir, filename)
            shutil.copy2(file_path, temp_file_path)
            
            # 使用 SimpleDirectoryReader 加载文档
            reader = SimpleDirectoryReader(
                input_dir=temp_dir,
                recursive=False,
            )
            
            documents = reader.load_data()
            
            return documents
            
        finally:
            # 清理临时目录
            shutil.rmtree(temp_dir, ignore_errors=True)
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """获取文件扩展名"""
        return os.path.splitext(filename)[1].lower()
    
    @staticmethod
    def is_supported_file(filename: str, allowed_extensions: List[str]) -> bool:
        """检查文件是否支持"""
        ext = DocumentProcessor.get_file_extension(filename)
        return ext in allowed_extensions

document_processor = DocumentProcessor()
