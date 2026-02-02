from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # API 设置
    API_TITLE: str = "LlamaIndex RAG API"
    API_VERSION: str = "1.0.0"
    
    # Qdrant 设置
    QDRANT_HOST: str = "10.10.107.57"
    QDRANT_PORT: int = 6333
    QDRANT_COLLECTION: str = "llamaindex_demo"
    
    # OpenAI 设置
    OPENAI_API_KEY: str
    OPENAI_API_BASE: str
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    
    # 文件上传设置
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: list = [".txt", ".pdf", ".docx", ".md"]
    
    class Config:
        env_file = ".env"

settings = Settings()
