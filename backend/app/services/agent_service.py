from llama_index.core import Settings
from llama_index.core.vector_stores import MetadataFilters, MetadataFilter, FilterOperator, FilterCondition
from llama_index.core.tools import FunctionTool
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.core.llms import ChatMessage, MessageRole
from typing import List, Dict, Optional

from ..logger import logger
from .vector_store import VectorStoreService


class AgentService:
    """智能代理服务 - 负责处理对话和查询"""
    
    def __init__(self, vector_store_service: VectorStoreService):
        self.vector_store_service = vector_store_service
    
    async def query(self, query_text: str, chat_history: List[Dict], file_ids: Optional[List[str]] = None, top_k: int = 3):
        """使用 FunctionAgent 进行对话查询"""
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
        
        async def search_documents(query: str) -> str:
            """Useful for answering natural language questions about uploaded documents."""
            logger.info(f"Agent调用搜索工具，查询内容: {query}")
            response = await query_engine.aquery(query)
            logger.info(f"搜索工具返回结果: {str(response)[:200]}... (Total len: {len(str(response))})")
            
            # 记录详细的源节点信息以便调试
            if hasattr(response, 'source_nodes'):
                logger.info(f"搜索到 {len(response.source_nodes)} 个相关片段")
                for i, node in enumerate(response.source_nodes):
                    logger.info(f"  [片段 {i+1}] Score: {node.score:.4f}, File: {node.metadata.get('filename')}")
                    logger.info(f"  Content: {node.text}")  # 打印片段内容
            
            return str(response)

        query_tool = FunctionTool.from_defaults(
            async_fn=search_documents,
            name="search_documents",
            description="Useful for retrieving information from uploaded documents."
        )
        
        # 使用 FunctionAgent
        agent = FunctionAgent(
            name="rag_agent",
            tools=[query_tool],
            llm=Settings.llm,
            system_prompt="你是一个智能助手。你必须优先使用工具查询文档库来回答用户的问题"
        )
        
        # FunctionAgent (Workflow) 使用 run 方法
        handler = agent.run(user_msg=query_text, chat_history=messages)
        output = await handler
        
        # output 是 AgentOutput 对象
        return output

    async def chat(self, message: str, chat_history: List[Dict]):
        """纯 LLM 对话，不检索向量库"""
        messages = []
        for msg in chat_history:
            role = MessageRole.USER if msg.role == "user" else MessageRole.ASSISTANT
            messages.append(ChatMessage(role=role, content=msg.content))
        
        # 添加当前用户消息
        messages.append(ChatMessage(role=MessageRole.USER, content=message))
            
        # 使用配置好的 LLM 直接回答
        return await Settings.llm.achat(messages)


# 全局实例
from .vector_store import vector_store_service
agent_service = AgentService(vector_store_service)
