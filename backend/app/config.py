from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    # API 设置
    API_TITLE: str = "LlamaIndex RAG API"
    API_VERSION: str = "1.0.0"
    
    # Qdrant 设置
    QDRANT_HOST: str = "10.10.107.57"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "llamaindex_demo"
    
    # MongoDB 设置
    MONGO_URI: str = "mongodb://admin:admin123@10.10.107.57:27017"
    MONGO_DB: str = "llamaindex_db"
    MONGO_COLLECTION_METADATA: str = "file_metadata"
    
    # OpenAI 设置
    OPENAI_API_KEY: str
    OPENAI_API_BASE: str
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # Mem0 设置 (可选，如果使用 Mem0 Platform API)
    MEM0_API_KEY: str = ""  # 如果为空，则使用 OSS 配置
    MEM0_SEARCH_MSG_LIMIT: int = 5  # 用于检索的消息数量
    
    # 文件上传设置
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB（支持更大的文档）
    # 支持的文件扩展名（由DocumentProcessor自动管理）
    # PDF, Word (.docx, .doc), Excel (.xlsx, .xls, .csv),
    # PowerPoint (.pptx, .ppt), 文本文档 (.txt, .md, .rst, .log)
    # 以及其他格式 (.json, .html, .xml, .epub)
    
    class Config:
        env_file = ".env"

settings = Settings()
os.environ["OPENAI_API_BASE"] = settings.OPENAI_API_BASE
os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY