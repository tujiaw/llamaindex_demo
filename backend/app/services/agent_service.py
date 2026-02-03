from llama_index.core import Settings
from llama_index.core.vector_stores import MetadataFilters, MetadataFilter, FilterOperator, FilterCondition
from llama_index.core.tools import FunctionTool
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.memory.mem0 import Mem0Memory
from typing import List, Dict, Optional
import asyncio

from ..logger import logger
from .vector_store import VectorStoreService
from ..config import settings


class AgentService:
    """智能代理服务 - 负责处理对话和查询"""
    
    def __init__(self, vector_store_service: VectorStoreService):
        self.vector_store_service = vector_store_service
        self._mem0_memories = {}  # 缓存不同用户的记忆实例
        self._mem0_lock = asyncio.Lock()  # 保护 _mem0_memories 的锁
    
    async def _get_or_create_memory(self, user_id: str) -> Mem0Memory:
        """
        获取或创建用户的 Mem0 记忆实例（线程安全）
        
        注意：Mem0 OSS 模式目前可能不完全支持自定义 OpenAI endpoint (如 Azure OpenAI)
        如果你使用的是自定义 endpoint，建议：
        1. 使用 Mem0 Platform (设置 MEM0_API_KEY 环境变量)
        2. 或者在项目中禁用记忆功能
        """
        # 先检查是否已存在（无锁快速路径）
        if user_id in self._mem0_memories:
            return self._mem0_memories.get(user_id)
        
        # 需要创建，使用锁保护
        async with self._mem0_lock:
            # 双重检查，避免重复创建
            if user_id not in self._mem0_memories:
                try:
                    context = {"user_id": user_id}
                    
                    # 如果配置了 Mem0 Platform API Key，使用 Platform 模式
                    if settings.MEM0_API_KEY:
                        logger.info(f"为用户 {user_id} 创建 Mem0 Platform 记忆实例")
                        self._mem0_memories[user_id] = Mem0Memory.from_client(
                            context=context,
                            api_key=settings.MEM0_API_KEY,
                            search_msg_limit=settings.MEM0_SEARCH_MSG_LIMIT,
                        )
                        logger.info(f"✅ 成功为用户 {user_id} 创建 Mem0 Platform 记忆实例")
                    else:
                        # OSS 模式：通过环境变量配置
                        logger.info(f"尝试为用户 {user_id} 创建 Mem0 OSS 记忆实例")
                        logger.warning("⚠️  Mem0 需要通过环境变量访问 OpenAI API")
                        logger.warning("⚠️  如果你使用 Azure OpenAI 或其他自定义 endpoint，建议使用 Mem0 Platform")
                        
                        # 设置环境变量（Mem0 会自动读取）
                        import os
                        os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
                        if settings.OPENAI_API_BASE:
                            # Mem0 推荐使用 OPENAI_BASE_URL (新版本)，也支持 OPENAI_API_BASE (旧版本)
                            os.environ["OPENAI_BASE_URL"] = settings.OPENAI_API_BASE
                            os.environ["OPENAI_API_BASE"] = settings.OPENAI_API_BASE  # 兼容旧版本
                            logger.info(f"   设置 OPENAI_BASE_URL: {settings.OPENAI_API_BASE}")
                        
                        mem0_config = {
                            "vector_store": {
                                "provider": "qdrant",
                                "config": {
                                    "collection_name": f"mem0_{user_id}",
                                    "host": settings.QDRANT_HOST,
                                    "port": settings.QDRANT_PORT,
                                    "embedding_model_dims": 1536,
                                },
                            },
                            "llm": {
                                "provider": "openai",
                                "config": {
                                    "model": settings.OPENAI_MODEL,
                                    "temperature": 0.2,
                                    "max_tokens": 1500,
                                    # 不要在这里设置 api_key 和 base_url
                                    # Mem0 会自动从环境变量读取
                                },
                            },
                            "embedder": {
                                "provider": "openai",
                                "config": {
                                    "model": settings.OPENAI_EMBEDDING_MODEL,
                                    # 不要在这里设置 api_key 和 base_url
                                    # Mem0 会自动从环境变量读取
                                },
                            },
                            "version": "v1.1",
                        }
                        self._mem0_memories[user_id] = Mem0Memory.from_config(
                            context=context,
                            config=mem0_config,
                            search_msg_limit=settings.MEM0_SEARCH_MSG_LIMIT,
                        )
                        logger.info(f"✅ 成功为用户 {user_id} 创建 Mem0 OSS 记忆实例")
                except Exception as e:
                    logger.error(f"❌ 创建 Mem0 记忆失败: {e}")
                    logger.error(f"   记忆功能将被禁用，系统将使用传统的聊天历史")
                    logger.error(f"   建议：")
                    logger.error(f"   1. 使用 Mem0 Platform (设置 MEM0_API_KEY)")
                    logger.error(f"   2. 或使用标准的 OpenAI API (不使用自定义 endpoint)")
                    # 如果失败，缓存 None，避免重复尝试
                    self._mem0_memories[user_id] = None
                    return None
            
            return self._mem0_memories.get(user_id)
    
    async def chat(self, message: str, file_ids: Optional[List[str]] = None, top_k: int = 3, user_id: str = "default_user"):
        """
        统一的聊天接口，根据 file_ids 决定是否加载文档检索工具
        
        完全使用 Mem0 管理记忆，不需要传入 chat_history
        
        Args:
            message: 用户消息
            file_ids: 文件ID列表，为空时不加载文档检索工具
            top_k: 检索文档数量
            user_id: 用户ID，用于 Mem0 记忆管理
            
        Returns:
            tuple: (agent_output, source_nodes) - agent输出和源节点列表
        """
        # 初始化向量存储（如果需要）
        if file_ids and not self.vector_store_service.index:
            await self.vector_store_service.initialize()
        
        # 获取或创建该用户的 Mem0 记忆实例
        memory = await self._get_or_create_memory(user_id)
        
        # 根据 file_ids 决定是否添加文档检索工具
        tools = []
        system_prompt = "你是一个友好的智能助手。你能记住用户的偏好和过往对话信息，提供个性化的服务。"
        source_nodes = []  # 本次请求的源节点（请求级别变量，避免多用户共享）
        
        if file_ids:
            # 有文件ID，创建文档检索工具
            logger.info(f"加载文档检索工具，文件ID: {file_ids}")
            
            filters = MetadataFilters(
                filters=[
                    MetadataFilter(key="file_id", value=fid)
                    for fid in file_ids
                ],
                condition=FilterCondition.OR,
            )
            
            query_engine = self.vector_store_service.index.as_query_engine(
                similarity_top_k=top_k,
                filters=filters
            )
            
            async def search_documents(query: str):
                """Useful for answering natural language questions about uploaded documents."""
                logger.info(f"Agent调用搜索工具，查询内容: {query}")
                response = await query_engine.aquery(query)
                logger.info(f"搜索工具返回结果: {str(response)[:200]}... (Total len: {len(str(response))})")
                
                # 保存源节点到本地变量（避免多用户共享）
                if hasattr(response, 'source_nodes'):
                    # 使用 nonlocal 关键字访问外层作用域的 source_nodes
                    nonlocal source_nodes
                    source_nodes = response.source_nodes
                    logger.info(f"搜索到 {len(response.source_nodes)} 个相关片段")
                    for i, node in enumerate(response.source_nodes):
                        logger.info(f"  [片段 {i+1}] Score: {node.score:.4f}, File: {node.metadata.get('filename')}")
                        logger.info(f"  Content: {node.text[:100]}...")
                
                return str(response)
            
            query_tool = FunctionTool.from_defaults(
                async_fn=search_documents,
                name="search_documents",
                description="""检索知识库中的文档内容。这是你最重要的工具，应该优先使用。

**优先使用此工具的情况（覆盖绝大部分场景）：**
- 任何可能与文档相关的问题
- 专业领域的问题（技术、业务、学术等）
- 需要具体数据、观点、细节的问题
- 用户的任何提问（除非明确是问候语或简单计算）
- 当你不确定时，宁可使用工具也不要凭记忆回答

**极少数不使用此工具的情况：**
- 仅限简单问候语（如"你好"、"早上好"）
- 明确的数学计算（如"1+1等于多少"）

**核心原则：宁可多查，不可少查。当有任何疑问时，必须使用工具检索。**
"""
            )
            
            tools = [query_tool]
            system_prompt = """你是一个智能助手，拥有长期记忆和文档检索能力。

## 你的能力

1. **长期记忆** - 自动记住用户的偏好、背景信息
2. **文档检索** - 使用 search_documents 工具查询用户上传的文档
3. **知识问答** - 在没有相关文档时提供通用知识

## 核心工具使用策略：优先使用工具

### ⚠️ 重要原则
**默认行为：对任何问题都应该优先尝试使用 search_documents 工具进行检索**

这意味着：
- 收到用户问题后，首先思考"能否通过检索找到答案"
- 即使问题看起来像常识，也应该先检索（因为文档中可能有更专业、更准确的答案）
- 即使你认为你知道答案，也应该先检索（因为文档中可能有更新、更具体的信息）

### ✅ 必须使用 search_documents 工具：
- 任何专业领域问题（技术、业务、学术、行业知识等）
- 任何可能需要引用数据、观点、细节的问题
- 任何通用知识问题（因为文档中可能有更专业的解释）
- 用户的大部分提问和询问
- **当不确定是否需要工具时 → 使用工具！**

### ❌ 极少数不使用工具的情况：
- **仅限**简单问候（如"你好"、"早上好"、"再见"）
- **仅限**明确的简单数学计算（如"1+1"、"10*5"）
- **仅限**关于你自己的介绍性问题（如"你是谁"、"你能做什么"）
- **仅限**编程相关问题（如"Python怎样进行异步编程"）

### 🎯 决策流程：
1. 收到用户问题
2. 这是简单问候或介绍性问题吗？→ 否 → **立即使用 search_documents 工具**
3. 这是明确的简单计算吗？→ 否 → **立即使用 search_documents 工具**
4. 任何其他情况 → **立即使用 search_documents 工具**

## 回答要求
- 优先使用工具检索，基于检索结果回答
- 如果检索结果不相关，再考虑使用通用知识补充
- 结合长期记忆，提供个性化的回答
- 宁可多检索，不要凭记忆编造"""
        else:
            # 没有文件ID，不加载文档检索工具
            logger.info("未指定文件ID，不加载文档检索工具")
        
        # 使用 FunctionAgent（即使没有工具也可以使用，以便支持 memory）
        agent = FunctionAgent(
            name="chat_agent_with_memory",
            tools=tools,
            llm=Settings.llm,
            system_prompt=system_prompt
        )
        
        # 使用 Mem0 记忆进行对话
        if memory:
            logger.info(f"使用 Mem0 记忆进行对话（用户: {user_id}，工具数: {len(tools)}）")
            handler = agent.run(user_msg=message, memory=memory)
        else:
            logger.warning(f"Mem0 记忆创建失败，使用空聊天历史（用户: {user_id}，工具数: {len(tools)}）")
            # 如果 Mem0 创建失败，使用空的 chat_history
            handler = agent.run(user_msg=message, chat_history=[])
        
        output = await handler
        
        # output 是 AgentOutput 对象，返回 output 和 source_nodes
        return output, source_nodes


# 单例实例（依赖注入模式）
from .vector_store import get_vector_store_service

_agent_service: Optional['AgentService'] = None

def get_agent_service() -> 'AgentService':
    """
    获取 AgentService 单例（依赖注入模式）
    
    特性：
    - 延迟初始化：只在首次使用时创建
    - 自动依赖管理：自动获取 VectorStoreService
    - 单例模式：应用生命周期内只有一个实例
    - 易于测试：可以通过 FastAPI dependency_overrides 替换
    """
    global _agent_service
    if _agent_service is None:
        vector_store = get_vector_store_service()
        _agent_service = AgentService(vector_store)
    return _agent_service
