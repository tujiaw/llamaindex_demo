from llama_index.core import Document, Settings
from llama_index.core.node_parser import SentenceSplitter
from typing import List, Optional, Dict, Any
import os
import logging
from pathlib import Path
import asyncio
import threading

# 配置日志
logger = logging.getLogger(__name__)


class DocumentProcessor:
    """
    生产级文档处理器
    
    支持多种文档格式，使用最佳解析方案：
    - PDF: PyMuPDFReader（高质量解析）
    - Word (.docx, .doc): Docx解析器和LegacyOfficeReader
    - Excel (.xlsx, .xls): PandasExcelReader
    - PowerPoint (.pptx, .ppt): 内置PPT解析器
    - 文本文档 (.txt, .md等): 标准文本解析器
    """
    
    # 支持的文档类型
    SUPPORTED_EXTENSIONS = {
        # PDF文档
        'pdf': ['.pdf'],
        # Word文档
        'word': ['.docx', '.doc'],
        # Excel文档
        'excel': ['.xlsx', '.xls', '.csv'],
        # PowerPoint文档
        'powerpoint': ['.pptx', '.ppt'],
        # 文本文档
        'text': ['.txt', '.md', '.rst', '.log'],
        # 其他
        'other': ['.json', '.html', '.xml', '.epub']
    }
    
    def __init__(
        self,
        chunk_size: int = 1024,
        chunk_overlap: int = 200,
        enable_metadata: bool = True
    ):
        """
        初始化文档处理器
        
        Args:
            chunk_size: 文档分块大小
            chunk_overlap: 分块重叠大小
            enable_metadata: 是否启用元数据提取
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.enable_metadata = enable_metadata
        
        # 初始化文本分割器
        self.text_splitter = SentenceSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        
        # 延迟加载读取器（避免不必要的导入）
        self._readers = {}
        self._readers_lock = threading.Lock()  # 保护 _readers 字典的锁（使用线程锁因为读取器加载是同步的）
        
    def _get_pdf_reader(self):
        """获取PDF读取器（线程安全）"""
        # 快速路径：如果已加载，直接返回
        if 'pdf' in self._readers:
            return self._readers['pdf']
        
        # 使用锁保护加载过程
        with self._readers_lock:
            # 双重检查，避免重复加载
            if 'pdf' not in self._readers:
                try:
                    from llama_index.readers.file import PyMuPDFReader
                    self._readers['pdf'] = PyMuPDFReader()
                    logger.info("已加载 PyMuPDFReader 用于PDF解析")
                except ImportError:
                    logger.warning("PyMuPDFReader 不可用，将使用默认PDF解析器")
                    self._readers['pdf'] = None
            return self._readers['pdf']
    
    def _get_docx_reader(self):
        """获取Word文档读取器（线程安全）"""
        if 'docx' in self._readers:
            return self._readers['docx']
        
        with self._readers_lock:
            if 'docx' not in self._readers:
                try:
                    from llama_index.readers.file import DocxReader
                    self._readers['docx'] = DocxReader()
                    logger.info("已加载 DocxReader 用于Word文档解析")
                except ImportError:
                    logger.warning("DocxReader 不可用，将使用默认解析器")
                    self._readers['docx'] = None
            return self._readers['docx']
    
    def _get_legacy_office_reader(self):
        """
        获取旧版Office文档读取器（.doc文件）（线程安全）
        
        注意: 需要安装 llama-index-readers-legacy-office 包和 Java 运行环境
        安装方法: uv pip install llama-index-readers-legacy-office
        """
        if 'legacy_office' in self._readers:
            return self._readers['legacy_office']
        
        with self._readers_lock:
            if 'legacy_office' not in self._readers:
                try:
                    from llama_index.readers.legacy_office import LegacyOfficeReader  # type: ignore
                    self._readers['legacy_office'] = LegacyOfficeReader()
                    logger.info("已加载 LegacyOfficeReader 用于.doc文件解析")
                except ImportError:
                    logger.warning("LegacyOfficeReader 不可用，.doc文件可能无法解析")
                    self._readers['legacy_office'] = None
            return self._readers['legacy_office']
    
    def _get_excel_reader(self):
        """获取Excel读取器（线程安全）"""
        if 'excel' in self._readers:
            return self._readers['excel']
        
        with self._readers_lock:
            if 'excel' not in self._readers:
                try:
                    from llama_index.readers.file import PandasExcelReader
                    self._readers['excel'] = PandasExcelReader()
                    logger.info("已加载 PandasExcelReader 用于Excel解析")
                except ImportError:
                    logger.warning("PandasExcelReader 不可用，将使用pandas直接读取")
                    self._readers['excel'] = None
            return self._readers['excel']
    
    def _get_pptx_reader(self):
        """获取PowerPoint读取器（线程安全）"""
        if 'pptx' in self._readers:
            return self._readers['pptx']
        
        with self._readers_lock:
            if 'pptx' not in self._readers:
                try:
                    from llama_index.readers.file import PptxReader
                    self._readers['pptx'] = PptxReader()
                    logger.info("已加载 PptxReader 用于PowerPoint解析")
                except ImportError:
                    logger.warning("PptxReader 不可用，将使用默认解析器")
                    self._readers['pptx'] = None
            return self._readers['pptx']
    
    def _parse_pdf(self, file_path: str) -> List[Document]:
        """解析PDF文档"""
        reader = self._get_pdf_reader()
        if reader:
            try:
                documents = reader.load_data(file_path=file_path)
                logger.info(f"使用 PyMuPDFReader 成功解析PDF: {file_path}")
                return documents
            except Exception as e:
                logger.error(f"PyMuPDFReader 解析失败: {e}，尝试使用默认解析器")
        
        # 使用默认解析器作为后备
        return self._parse_with_simple_reader(file_path, ['.pdf'])
    
    def _parse_word(self, file_path: str) -> List[Document]:
        """解析Word文档"""
        ext = self.get_file_extension(file_path)
        
        # .doc 文件使用 LegacyOfficeReader
        if ext == '.doc':
            reader = self._get_legacy_office_reader()
            if reader:
                try:
                    documents = reader.load_data(file=Path(file_path))
                    logger.info(f"使用 LegacyOfficeReader 成功解析.doc文件: {file_path}")
                    return documents
                except Exception as e:
                    logger.error(f"LegacyOfficeReader 解析失败: {e}")
        
        # .docx 文件使用 DocxReader
        else:
            reader = self._get_docx_reader()
            if reader:
                try:
                    documents = reader.load_data(file=Path(file_path))
                    logger.info(f"使用 DocxReader 成功解析.docx文件: {file_path}")
                    return documents
                except Exception as e:
                    logger.error(f"DocxReader 解析失败: {e}，尝试使用默认解析器")
        
        # 使用默认解析器作为后备
        return self._parse_with_simple_reader(file_path, ['.docx', '.doc'])
    
    def _parse_excel(self, file_path: str) -> List[Document]:
        """解析Excel文档"""
        ext = self.get_file_extension(file_path)
        
        # CSV文件使用默认解析器
        if ext == '.csv':
            return self._parse_with_simple_reader(file_path, ['.csv'])
        
        # Excel文件使用专用读取器
        reader = self._get_excel_reader()
        if reader:
            try:
                documents = reader.load_data(file=Path(file_path))
                logger.info(f"使用 PandasExcelReader 成功解析Excel: {file_path}")
                return documents
            except Exception as e:
                logger.error(f"PandasExcelReader 解析失败: {e}")
        
        # 尝试使用pandas作为后备
        try:
            import pandas as pd
            df = pd.read_excel(file_path) if ext in ['.xlsx', '.xls'] else pd.read_csv(file_path)
            text = df.to_string()
            doc = Document(
                text=text,
                metadata=self._extract_metadata(file_path)
            )
            logger.info(f"使用 pandas 成功解析Excel: {file_path}")
            return [doc]
        except Exception as e:
            logger.error(f"pandas 解析失败: {e}")
            raise ValueError(f"无法解析Excel文件: {file_path}")
    
    def _parse_powerpoint(self, file_path: str) -> List[Document]:
        """解析PowerPoint文档"""
        reader = self._get_pptx_reader()
        if reader:
            try:
                documents = reader.load_data(file=Path(file_path))
                logger.info(f"使用 PptxReader 成功解析PowerPoint: {file_path}")
                return documents
            except Exception as e:
                logger.error(f"PptxReader 解析失败: {e}，尝试使用默认解析器")
        
        # 使用默认解析器作为后备
        return self._parse_with_simple_reader(file_path, ['.pptx', '.ppt'])
    
    def _parse_text(self, file_path: str) -> List[Document]:
        """解析文本文档"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
            
            doc = Document(
                text=text,
                metadata=self._extract_metadata(file_path)
            )
            logger.info(f"成功解析文本文件: {file_path}")
            return [doc]
        except UnicodeDecodeError:
            # 尝试其他编码
            for encoding in ['gbk', 'gb2312', 'latin-1']:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        text = f.read()
                    doc = Document(
                        text=text,
                        metadata=self._extract_metadata(file_path)
                    )
                    logger.info(f"使用 {encoding} 编码成功解析文本文件: {file_path}")
                    return [doc]
                except:
                    continue
            raise ValueError(f"无法解析文本文件（编码问题）: {file_path}")
    
    def _parse_with_simple_reader(self, file_path: str, required_exts: List[str]) -> List[Document]:
        """使用SimpleDirectoryReader解析文档"""
        from llama_index.core import SimpleDirectoryReader
        
        try:
            reader = SimpleDirectoryReader(
                input_files=[file_path],
                required_exts=required_exts,
                filename_as_id=True,
            )
            documents = reader.load_data()
            logger.info(f"使用 SimpleDirectoryReader 成功解析文件: {file_path}")
            return documents
        except Exception as e:
            logger.error(f"SimpleDirectoryReader 解析失败: {e}")
            raise ValueError(f"无法解析文件: {file_path}")
    
    def _extract_metadata(self, file_path: str) -> Dict[str, Any]:
        """提取文件元数据"""
        if not self.enable_metadata:
            return {}
        
        metadata = {
            'file_path': file_path,
            'file_name': os.path.basename(file_path),
            'file_size': os.path.getsize(file_path),
            'file_extension': self.get_file_extension(file_path),
        }
        
        # 添加文件时间戳
        stat = os.stat(file_path)
        metadata['created_at'] = stat.st_ctime
        metadata['modified_at'] = stat.st_mtime
        
        return metadata
    
    def _determine_document_type(self, file_path: str) -> Optional[str]:
        """判断文档类型"""
        ext = self.get_file_extension(file_path)
        
        for doc_type, extensions in self.SUPPORTED_EXTENSIONS.items():
            if ext in extensions:
                return doc_type
        
        return None
    
    async def process_file(self, file_path: str) -> List[Document]:
        """
        处理单个文件，返回文档列表
        
        Args:
            file_path: 文件路径
            
        Returns:
            文档列表
            
        Raises:
            ValueError: 文件不支持或解析失败
        """
        if not os.path.exists(file_path):
            raise ValueError(f"文件不存在: {file_path}")
        
        # 判断文档类型
        doc_type = self._determine_document_type(file_path)
        if not doc_type:
            ext = self.get_file_extension(file_path)
            raise ValueError(f"不支持的文件类型: {ext}")
        
        logger.info(f"开始处理文件: {file_path} (类型: {doc_type})")
        
        # 根据文档类型选择解析方法
        try:
            if doc_type == 'pdf':
                documents = self._parse_pdf(file_path)
            elif doc_type == 'word':
                documents = self._parse_word(file_path)
            elif doc_type == 'excel':
                documents = self._parse_excel(file_path)
            elif doc_type == 'powerpoint':
                documents = self._parse_powerpoint(file_path)
            else:  # 其他类型使用默认解析器
                ext = self.get_file_extension(file_path)
                documents = self._parse_with_simple_reader(file_path, [ext])
            
            # 添加额外的元数据
            for doc in documents:
                if self.enable_metadata and doc.metadata:
                    doc.metadata['document_type'] = doc_type
                    doc.metadata['processed_by'] = 'DocumentProcessor'
            
            logger.info(f"成功处理文件: {file_path}，生成 {len(documents)} 个文档块")
            return documents
            
        except Exception as e:
            logger.error(f"处理文件失败: {file_path}，错误: {str(e)}")
            raise
    
    @staticmethod
    def get_file_extension(filename: str) -> str:
        """获取文件扩展名"""
        return os.path.splitext(filename)[1].lower()
    
    @classmethod
    def get_all_supported_extensions(cls) -> List[str]:
        """获取所有支持的文件扩展名"""
        extensions = []
        for ext_list in cls.SUPPORTED_EXTENSIONS.values():
            extensions.extend(ext_list)
        return extensions
    
    @staticmethod
    def is_supported_file(filename: str) -> bool:
        """检查文件是否支持"""
        ext = DocumentProcessor.get_file_extension(filename)
        all_exts = DocumentProcessor.get_all_supported_extensions()
        return ext in all_exts


# 单例实例（依赖注入模式）
_document_processor: Optional[DocumentProcessor] = None

def get_document_processor() -> DocumentProcessor:
    """
    获取 DocumentProcessor 单例（依赖注入模式）
    
    特性：
    - 延迟初始化：只在首次使用时创建
    - 单例模式：应用生命周期内只有一个实例
    - 易于测试：可以通过 FastAPI dependency_overrides 替换
    """
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor()
    return _document_processor
