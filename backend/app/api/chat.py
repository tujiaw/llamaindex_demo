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

        # 提取源信息
        sources = []
        if hasattr(agent_output, 'tool_calls'):
            for tool_call in agent_output.tool_calls:
                # 检查是否包含 tool_output (ToolCallResult) 且有 raw_output (Response)
                if (hasattr(tool_call, 'tool_output') and 
                    hasattr(tool_call.tool_output, 'raw_output')):
                    raw_output = tool_call.tool_output.raw_output
                    
                    if hasattr(raw_output, 'source_nodes'):
                        for node in raw_output.source_nodes:
                            sources.append({
                                "text": node.text,
                                "score": float(node.score) if hasattr(node, 'score') else 0.0,
                                "filename": node.metadata.get("filename", "未知"),
                                "file_id": node.metadata.get("file_id", "")
                            })
        
        return ChatResponse(
            response=response_text,
            sources=sources
        )
    
    except Exception as e:
        logger.error(f"查询处理失败: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
