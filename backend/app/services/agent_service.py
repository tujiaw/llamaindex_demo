from llama_index.core import Settings
from llama_index.core.vector_stores import MetadataFilters, MetadataFilter, FilterOperator, FilterCondition
from llama_index.core.tools import FunctionTool
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.core.llms import ChatMessage, MessageRole
from llama_index.memory.mem0 import Mem0Memory
from typing import List, Dict, Optional

from ..logger import logger
from .vector_store import VectorStoreService
from ..config import settings


class AgentService:
    """智能代理服务 - 负责处理对话和查询"""
    
    def __init__(self, vector_store_service: VectorStoreService):
        self.vector_store_service = vector_store_service
        self.last_source_nodes = []  # 保存最后一次查询的源节点
        self._mem0_memories = {}  # 缓存不同用户的记忆实例
    
    def _get_or_create_memory(self, user_id: str) -> Mem0Memory:
        """
        获取或创建用户的 Mem0 记忆实例
        
        注意：Mem0 OSS 模式目前可能不完全支持自定义 OpenAI endpoint (如 Azure OpenAI)
        如果你使用的是自定义 endpoint，建议：
        1. 使用 Mem0 Platform (设置 MEM0_API_KEY 环境变量)
        2. 或者在项目中禁用记忆功能
        """
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
    
    async def query(self, query_text: str, chat_history: List[Dict], file_ids: Optional[List[str]] = None, top_k: int = 3, user_id: str = "default_user"):
        """使用 FunctionAgent 进行对话查询，集成 Mem0 记忆模块"""
        if not self.vector_store_service.index:
            await self.vector_store_service.initialize()
            
        filters = None
        if file_ids:
            filters = MetadataFilters(
                filters=[
                    MetadataFilter(key="file_id", value=fid)
                    for fid in file_ids
                ],
                condition=FilterCondition.OR,
            )
        
        # 获取或创建该用户的 Mem0 记忆实例
        memory = self._get_or_create_memory(user_id)
        
        # 将历史记录转换为 LlamaIndex 的 ChatMessage 对象
        messages = []
        for msg in chat_history:
            role = MessageRole.USER if msg.role == "user" else MessageRole.ASSISTANT
            messages.append(ChatMessage(role=role, content=msg.content))
            
        # 创建查询引擎工具
        query_engine = self.vector_store_service.index.as_query_engine(
            similarity_top_k=top_k,
            filters=filters
        )
        
        async def search_documents(query: str):
            """Useful for answering natural language questions about uploaded documents."""
            logger.info(f"Agent调用搜索工具，查询内容: {query}")
            response = await query_engine.aquery(query)
            logger.info(f"搜索工具返回结果: {str(response)[:200]}... (Total len: {len(str(response))})")
            
            # 保存源节点供后续使用
            if hasattr(response, 'source_nodes'):
                self.last_source_nodes = response.source_nodes
                logger.info(f"搜索到 {len(response.source_nodes)} 个相关片段")
                for i, node in enumerate(response.source_nodes):
                    logger.info(f"  [片段 {i+1}] Score: {node.score:.4f}, File: {node.metadata.get('filename')}")
                    logger.info(f"  Content: {node.text[:100]}...")  # 打印片段内容前100字符
            else:
                self.last_source_nodes = []
            
            # 返回字符串给LLM，但源节点已保存
            return str(response)

        query_tool = FunctionTool.from_defaults(
            async_fn=search_documents,
            name="search_documents",
            description="""从已上传的文档中检索信息。

**必须使用此工具的情况：**
- 用户明确询问文档内容（如"文档里说了什么"、"总结这个PDF"）
- 用户询问特定领域的专业知识（可能在文档中）
- 用户要求引用、查找或验证具体信息
- 用户询问项目、产品、技术文档中的细节

**不要使用此工具的情况：**
- 日常生活问题（如"今天天气"、"如何做饭"）
- 常识性问题（如"地球有多大"、"什么是重力"）
- 闲聊和问候（如"你好"、"最近怎么样"）
- 通用建议（如"如何学习编程"、"如何锻炼身体"）

**判断原则：** 如果问题的答案可能在用户上传的文档中，则必须使用此工具；如果是普通常识或生活问题，直接回答即可。"""
        )
        
        # 增强的系统提示，结合记忆和知识库
        system_prompt = """你是一个智能助手，拥有长期记忆和文档检索能力。

## 你的能力

1. **长期记忆** - 自动记住用户的偏好、背景信息
2. **文档检索** - 使用 search_documents 工具查询用户上传的文档
3. **常识回答** - 直接回答日常问题和常识性问题

## 工具使用策略

### ✅ 必须使用 search_documents 工具：
- 用户明确提到"文档"、"PDF"、"上传的资料"等
- 询问专业领域知识（可能在文档中）
- 需要引用具体数据、观点、细节
- 例如："文档中提到的方案是什么？"、"总结一下这个报告"

### ❌ 不要使用 search_documents 工具：
- 日常生活问题："今天吃什么"、"如何锻炼"
- 通用常识："什么是Python"、"地球有多大"
- 闲聊问候："你好"、"最近怎么样"
- 通用建议："推荐一本书"、"如何学习"

### 🤔 判断原则：
**问自己：这个问题的答案可能在用户上传的文档中吗？**
- 是 → 使用 search_documents 工具
- 否 → 直接用你的知识回答

## 回答要求
- 使用工具时，基于检索结果回答，不要编造
- 不使用工具时，自信地用常识回答
- 结合长期记忆，提供个性化的回答"""
        
        # 使用 FunctionAgent，集成 Mem0 记忆
        agent = FunctionAgent(
            name="rag_agent_with_memory",
            tools=[query_tool],
            llm=Settings.llm,
            system_prompt=system_prompt
        )
        
        # 如果有 memory，则传入；否则使用默认的 chat_history
        if memory:
            logger.info(f"使用 Mem0 记忆进行对话（用户: {user_id}）")
            handler = agent.run(user_msg=query_text, memory=memory)
        else:
            logger.info(f"未使用记忆，使用传统聊天历史")
            handler = agent.run(user_msg=query_text, chat_history=messages)
        
        output = await handler
        
        # output 是 AgentOutput 对象
        return output

    async def chat(self, message: str, chat_history: List[Dict], user_id: str = "default_user"):
        """纯 LLM 对话，不检索向量库，但可以使用 Mem0 记忆"""
        # 获取或创建该用户的 Mem0 记忆实例
        memory = self._get_or_create_memory(user_id)
        
        if memory:
            # 使用 FunctionAgent 以支持 memory（即使没有工具）
            logger.info(f"使用 Mem0 记忆进行纯 LLM 对话（用户: {user_id}）")
            agent = FunctionAgent(
                name="chat_agent_with_memory",
                tools=[],  # 不提供工具
                llm=Settings.llm,
                system_prompt="你是一个友好的智能助手。你能记住用户的偏好和过往对话信息，提供个性化的服务。"
            )
            handler = agent.run(user_msg=message, memory=memory)
            output = await handler
            return output.response.content if hasattr(output, 'response') else str(output)
        else:
            # 没有记忆，使用传统方式
            messages = []
            for msg in chat_history:
                role = MessageRole.USER if msg.role == "user" else MessageRole.ASSISTANT
                messages.append(ChatMessage(role=role, content=msg.content))
            
            # 添加当前用户消息
            messages.append(ChatMessage(role=MessageRole.USER, content=message))
                
            # 使用配置好的 LLM 直接回答
            response = await Settings.llm.achat(messages)
            return response.message.content


# 全局实例
from .vector_store import vector_store_service
agent_service = AgentService(vector_store_service)
