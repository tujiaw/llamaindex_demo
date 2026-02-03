from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi import Request
from contextlib import asynccontextmanager
import os
import time
import warnings

# 过滤第三方库的 Pydantic 弃用警告
# 这些警告来自 mem0ai 和 llama-index 内部使用的已弃用 Pydantic V1 API
# 项目本身的代码已升级到 Pydantic V2 标准
warnings.filterwarnings(
    "ignore",
    category=DeprecationWarning,
    message=".*__fields__.*|.*__fields_set__.*|.*model_computed_fields.*|.*model_fields.*|.*OPENAI_API_BASE.*"
)

from .config import settings
from .services.vector_store import vector_store_service
from .api import files, chat
from .logger import logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时初始化向量存储
    await vector_store_service.initialize()
    logger.info("✅ 向量存储服务已初始化")
    yield
    # 关闭时的清理工作
    logger.info("🔴 应用关闭")

app = FastAPI(
    title=settings.API_TITLE,
    version=settings.API_VERSION,
    lifespan=lifespan
)

@app.middleware("http")
async def log_request_time(request: Request, call_next):
    """记录请求耗时的中间件"""
    start_time = time.perf_counter()
    try:
        response = await call_next(request)
        process_time = time.perf_counter() - start_time
        logger.info(f"Method: {request.method} | Path: {request.url.path} | Status: {response.status_code} | Duration: {process_time:.4f}s")
        return response
    except Exception as e:
        process_time = time.perf_counter() - start_time
        logger.error(f"Method: {request.method} | Path: {request.url.path} | Status: 500 | Duration: {process_time:.4f}s | Error: {str(e)}")
        raise e

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(files.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

# 挂载静态文件
# 假设 frontend 目录在项目根目录，即 backend/app 的上两级目录下的 frontend
# 我们需要找到正确的路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
frontend_dir = os.path.join(project_root, "frontend")

if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_dir, "static")), name="static")

    @app.get("/")
    async def root():
        return FileResponse(os.path.join(frontend_dir, "index.html"))
else:
    logger.warning(f"Frontend directory not found at {frontend_dir}")
    @app.get("/")
    async def root():
        return {
            "message": "LlamaIndex RAG API",
            "version": settings.API_VERSION,
            "docs": "/docs"
        }

@app.get("/health")
async def health():
    return {"status": "healthy"}
