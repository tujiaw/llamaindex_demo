from fastapi import APIRouter, HTTPException
from ..models import ChatRequest, ChatResponse
from ..dependencies import AgentServiceDep
from ..logger import logger

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/query", response_model=ChatResponse)
async def chat_query(
    request: ChatRequest,
    agent_service: AgentServiceDep
):
    """
    统一的对话接口 - 完全使用 Mem0 管理记忆
    
    特性：
    - 使用 Mem0 自动管理用户记忆，无需前端传入聊天历史
    - 自动记住用户偏好和关键信息
    - 当指定 file_ids 时，使用 search_documents 工具查询文档库
    - 当不指定 file_ids 时，进行纯 LLM 对话
    - 结合长期记忆和文档知识提供个性化答案
    """
    logger.info(f"收到聊天请求（用户: {request.user_id}）: {request.message[:50]}... (File IDs: {request.file_ids})")
    try:
        # 统一调用 chat 接口，根据 file_ids 自动决定是否加载文档检索工具
        # 完全使用 Mem0 管理记忆，不需要传入 chat_history
        # 返回值: (agent_output, source_nodes)
        agent_output, source_nodes = await agent_service.chat(
            message=request.message,
            file_ids=request.file_ids,
            user_id=request.user_id
        )
        
        # 提取回复文本
        response_text = ""
        if hasattr(agent_output, 'response'):
             # agent_output.response 是 ChatMessage
             response_text = agent_output.response.content
        else:
            response_text = str(agent_output)

        # 从返回值中获取源信息（而不是从共享实例变量）
        sources = []
        if source_nodes:
            logger.info(f"获取到 {len(source_nodes)} 个源片段")
            for node in source_nodes:
                source_data = {
                    "text": node.text,
                    "score": float(node.score) if hasattr(node, 'score') else 0.0,
                    "filename": node.metadata.get("filename", "未知"),
                    "file_id": node.metadata.get("file_id", "")
                }
                sources.append(source_data)
                logger.info(f"  - 添加片段: {source_data['filename']}, Score: {source_data['score']:.4f}")
        else:
            logger.info("没有可用的源片段")
        
        logger.info(f"最终返回 {len(sources)} 个源片段")
        
        return ChatResponse(
            response=response_text,
            sources=sources
        )
    
    except Exception as e:
        logger.error(f"查询处理失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
