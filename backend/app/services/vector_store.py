from llama_index.core import VectorStoreIndex, StorageContext, Settings, Document
from llama_index.core.vector_stores import MetadataFilters, MetadataFilter, FilterOperator
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qmodels
from typing import List, Dict, Optional
import os
import json
from datetime import datetime

from ..config import settings as app_settings

class VectorStoreService:
    """向量存储服务 - 负责管理文档和向量"""
    
    def __init__(self):
        self.qdrant_client = AsyncQdrantClient(
            host=app_settings.QDRANT_HOST,
            port=app_settings.QDRANT_PORT
        )
        
        # 配置 LlamaIndex
        Settings.embed_model = OpenAIEmbedding(
            model=app_settings.OPENAI_EMBEDDING_MODEL,
            api_key=app_settings.OPENAI_API_KEY,
            api_base=app_settings.OPENAI_API_BASE,
        )
        
        Settings.llm = OpenAI(
            temperature=0.1,
            model=app_settings.OPENAI_MODEL,
            api_key=app_settings.OPENAI_API_KEY,
            api_base=app_settings.OPENAI_API_BASE,
        )
        
        self.vector_store = QdrantVectorStore(
            aclient=self.qdrant_client,
            collection_name=app_settings.QDRANT_COLLECTION,
            enable_hybrid=False,
            stores_text=True,
        )
        
        self.storage_context = StorageContext.from_defaults(
            vector_store=self.vector_store
        )
        
        self.index: Optional[VectorStoreIndex] = None
        
        # 文件元数据存储（简单起见使用 JSON 文件）
        self.metadata_file = "backend/file_metadata.json"
        self.file_metadata = self._load_metadata()
    
    def _load_metadata(self) -> Dict:
        """加载文件元数据"""
        if os.path.exists(self.metadata_file):
            with open(self.metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}
    
    def _save_metadata(self):
        """保存文件元数据"""
        os.makedirs(os.path.dirname(self.metadata_file), exist_ok=True)
        with open(self.metadata_file, 'w', encoding='utf-8') as f:
            json.dump(self.file_metadata, f, ensure_ascii=False, indent=2)
    
    async def initialize(self):
        """初始化索引"""
        try:
            await self.qdrant_client.get_collection(app_settings.QDRANT_COLLECTION)
            # 集合存在，加载索引
            self.index = VectorStoreIndex.from_vector_store(
                vector_store=self.vector_store,
                storage_context=self.storage_context,
            )
            print(f"已加载现有索引: {app_settings.QDRANT_COLLECTION}")
        except Exception:
            # 集合不存在，创建空索引
            self.index = VectorStoreIndex.from_documents(
                [],
                storage_context=self.storage_context,
            )
            print(f"已创建新索引: {app_settings.QDRANT_COLLECTION}")
    
    async def add_documents(
        self, 
        file_id: str, 
        filename: str, 
        documents: List[Document],
        file_size: int
    ) -> int:
        """添加文档到向量存储"""
        # 为每个文档添加 file_id 元数据
        for doc in documents:
            doc.metadata["file_id"] = file_id
            doc.metadata["filename"] = filename
        
        # 插入文档
        for doc in documents:
            self.index.insert(doc)
        
        # 保存文件元数据
        self.file_metadata[file_id] = {
            "filename": filename,
            "size": file_size,
            "uploaded_at": datetime.now().isoformat(),
            "chunks_count": len(documents)
        }
        self._save_metadata()
        
        return len(documents)
    
    async def delete_file(self, file_id: str) -> int:
        """删除文件及其所有相关向量"""
        if file_id not in self.file_metadata:
            return 0
        
        # 使用 Qdrant Filter 删除 (更高效)
        try:
            # 尝试删除 - LlamaIndex 默认将 metadata 扁平化存储在 payload 中
            await self.qdrant_client.delete(
                collection_name=app_settings.QDRANT_COLLECTION,
                points_selector=qmodels.FilterSelector(
                    filter=qmodels.Filter(
                        must=[
                            qmodels.FieldCondition(
                                key="file_id",
                                match=qmodels.MatchValue(value=file_id)
                            )
                        ]
                    )
                )
            )
        except Exception as e:
            print(f"Error deleting from Qdrant: {e}")
            # 如果之前的代码认为 metadata 是嵌套的，尝试嵌套删除
            try:
                await self.qdrant_client.delete(
                    collection_name=app_settings.QDRANT_COLLECTION,
                    points_selector=qmodels.FilterSelector(
                        filter=qmodels.Filter(
                            must=[
                                qmodels.FieldCondition(
                                    key="metadata.file_id",
                                    match=qmodels.MatchValue(value=file_id)
                                )
                            ]
                        )
                    )
                )
            except Exception:
                pass

        # 删除文件元数据
        if file_id in self.file_metadata:
            del self.file_metadata[file_id]
            self._save_metadata()
        
        # 删除物理文件
        file_path = os.path.join(app_settings.UPLOAD_DIR, file_id)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        
        return 1 # 返回 1 表示成功，具体删除了多少个向量难以精确统计，但这不重要
    
    def get_all_files(self) -> List[Dict]:
        """获取所有文件信息"""
        return [
            {
                "file_id": file_id,
                **metadata
            }
            for file_id, metadata in self.file_metadata.items()
        ]
    
    async def query(self, query_text: str, file_ids: Optional[List[str]] = None, top_k: int = 3):
        """查询向量存储"""
        if not self.index:
            await self.initialize()
            
        filters = None
        if file_ids:
            filters = MetadataFilters(
                filters=[
                    MetadataFilter(key="file_id", value=fid)
                    for fid in file_ids
                ],
                operator=FilterOperator.OR,
            )
        
        query_engine = self.index.as_query_engine(
            similarity_top_k=top_k,
            filters=filters
        )
        response = await query_engine.aquery(query_text)
        
        return response

# 全局实例
vector_store_service = VectorStoreService()
