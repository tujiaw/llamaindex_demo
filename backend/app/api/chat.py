from fastapi import APIRouter, HTTPException
from ..models import ChatRequest, ChatResponse
from ..services.agent_service import agent_service
from ..logger import logger

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest):
    """
    对话查询 - 基于向量检索
    """
    logger.info(f"收到聊天请求: {request.message[:50]}... (File IDs: {request.file_ids})")
    try:
        # 如果没有选择文件，直接进行 LLM 对话
        if not request.file_ids:
            logger.info("未选择文件，进行纯 LLM 对话")
            response_text = await agent_service.chat(
                message=request.message,
                chat_history=request.chat_history
            )
            return ChatResponse(
                response=str(response_text),
                sources=[]
            )

        # 查询向量存储
        # response 是 AgentOutput 对象
        agent_output = await agent_service.query(
            query_text=request.message,
            chat_history=request.chat_history,
            file_ids=request.file_ids
        )
        
        # 提取回复文本
        response_text = ""
        if hasattr(agent_output, 'response'):
             # agent_output.response 是 ChatMessage
             response_text = agent_output.response.content
        else:
            response_text = str(agent_output)

        # 从 agent_service 直接获取源信息
        sources = []
        if agent_service.last_source_nodes:
            logger.info(f"从 agent_service 获取到 {len(agent_service.last_source_nodes)} 个源片段")
            for node in agent_service.last_source_nodes:
                source_data = {
                    "text": node.text,
                    "score": float(node.score) if hasattr(node, 'score') else 0.0,
                    "filename": node.metadata.get("filename", "未知"),
                    "file_id": node.metadata.get("file_id", "")
                }
                sources.append(source_data)
                logger.info(f"  - 添加片段: {source_data['filename']}, Score: {source_data['score']:.4f}")
        else:
            logger.info("agent_service 没有可用的源片段")
        
        logger.info(f"最终返回 {len(sources)} 个源片段")
        
        return ChatResponse(
            response=response_text,
            sources=sources
        )
    
    except Exception as e:
        logger.error(f"查询处理失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
