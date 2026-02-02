from fastapi import APIRouter, HTTPException
from ..models import ChatRequest, ChatResponse
from ..services.vector_store import vector_store_service

router = APIRouter(prefix="/chat", tags=["chat"])

@router.post("/query", response_model=ChatResponse)
async def chat_query(request: ChatRequest):
    """
    对话查询 - 基于向量检索
    """
    try:
        # 查询向量存储
        response = await vector_store_service.query(
            query_text=request.message,
            file_ids=request.file_ids
        )
        
        # 提取源信息
        sources = []
        if hasattr(response, 'source_nodes'):
            for node in response.source_nodes:
                sources.append({
                    "text": node.text[:200] + "..." if len(node.text) > 200 else node.text,
                    "score": float(node.score) if hasattr(node, 'score') else 0.0,
                    "filename": node.metadata.get("filename", "未知"),
                    "file_id": node.metadata.get("file_id", "")
                })
        
        return ChatResponse(
            response=str(response),
            sources=sources
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}")
