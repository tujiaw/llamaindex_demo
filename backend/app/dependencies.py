"""
FastAPI 依赖注入配置

这个模块提供了推荐的依赖注入方式，用于替代全局实例。

优势：
1. 延迟初始化 - 只在需要时创建实例
2. 易于测试 - 可以轻松替换为 mock 对象
3. 生命周期管理 - FastAPI 自动处理
4. 类型安全 - 完整的类型提示
"""

from typing import Annotated
from fastapi import Depends

from .services.vector_store import VectorStoreService, get_vector_store_service
from .services.agent_service import AgentService, get_agent_service
from .services.document_processor import DocumentProcessor, get_document_processor


# FastAPI 依赖注入类型别名
VectorStoreServiceDep = Annotated[VectorStoreService, Depends(get_vector_store_service)]
AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]
DocumentProcessorDep = Annotated[DocumentProcessor, Depends(get_document_processor)]


# 使用示例：
# 
# from .dependencies import AgentServiceDep, VectorStoreServiceDep
#
# @router.post("/chat")
# async def chat(
#     request: ChatRequest,
#     agent_service: AgentServiceDep  # 自动注入
# ):
#     result = await agent_service.chat(request.message)
#     return result
