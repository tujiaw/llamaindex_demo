from llama_index.core import VectorStoreIndex, StorageContext, Settings, Document
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from qdrant_client import AsyncQdrantClient, QdrantClient
from qdrant_client.http import models as qmodels
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Dict, Optional
import os
import json
from datetime import datetime

from ..config import settings as app_settings
from ..logger import logger

class VectorStoreService:
    """向量存储服务 - 负责管理文档和向量"""
    
    def __init__(self):
        self.qdrant_client = AsyncQdrantClient(
            host=app_settings.QDRANT_HOST,
            port=app_settings.QDRANT_PORT
        )
        self.sync_qdrant_client = QdrantClient(
            host=app_settings.QDRANT_HOST,
            port=app_settings.QDRANT_PORT
        )
        
        # MongoDB Client
        self.mongo_client = AsyncIOMotorClient(app_settings.MONGO_URI)
        self.db = self.mongo_client[app_settings.MONGO_DB]
        self.metadata_collection = self.db[app_settings.MONGO_COLLECTION_METADATA]
        
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
            client=self.sync_qdrant_client,
            aclient=self.qdrant_client,
            collection_name=app_settings.QDRANT_COLLECTION,
            enable_hybrid=False,
            stores_text=True,
        )
        
        self.storage_context = StorageContext.from_defaults(
            vector_store=self.vector_store
        )
        
        self.index: Optional[VectorStoreIndex] = None
        
    def _get_embedding_dim(self) -> int:
        """根据配置的模型名称获取向量维度"""
        model = app_settings.OPENAI_EMBEDDING_MODEL
        if "text-embedding-3-large" in model:
            return 3072
        # text-embedding-3-small and text-embedding-ada-002 are 1536
        return 1536

    async def initialize(self):
        """初始化索引"""
        try:
            # 检查集合是否存在
            exists = await self.qdrant_client.collection_exists(app_settings.QDRANT_COLLECTION)
            
            if not exists:
                logger.info(f"集合不存在，创建新索引: {app_settings.QDRANT_COLLECTION}")
                vector_size = self._get_embedding_dim()
                await self.qdrant_client.create_collection(
                    collection_name=app_settings.QDRANT_COLLECTION,
                    vectors_config=qmodels.VectorParams(
                        size=vector_size,
                        distance=qmodels.Distance.COSINE
                    )
                )
            else:
                logger.info(f"已加载现有索引: {app_settings.QDRANT_COLLECTION}")
            
            self.index = VectorStoreIndex.from_vector_store(
                vector_store=self.vector_store,
                storage_context=self.storage_context,
            )
            
        except Exception as e:
            logger.error(f"初始化索引失败: {e}")
            # 如果失败，尝试使用空文档列表初始化（作为后备方案）
            try:
                self.index = VectorStoreIndex.from_documents(
                    [],
                    storage_context=self.storage_context,
                )
                logger.warning(f"已通过 from_documents 创建新索引: {app_settings.QDRANT_COLLECTION}")
            except Exception as e2:
                logger.error(f"后备初始化也失败: {e2}")
    
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
        
        # 保存文件元数据到 MongoDB
        metadata = {
            "file_id": file_id,
            "filename": filename,
            "size": file_size,
            "uploaded_at": datetime.now().isoformat(),
            "chunks_count": len(documents)
        }
        await self.metadata_collection.insert_one(metadata)
        
        return len(documents)
    
    async def delete_file(self, file_id: str) -> int:
        """删除文件及其所有相关向量"""
        # 检查文件是否存在
        file_doc = await self.metadata_collection.find_one({"file_id": file_id})
        if not file_doc:
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
            logger.error(f"Error deleting from Qdrant: {e}")
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

        # 删除文件元数据 from MongoDB
        await self.metadata_collection.delete_one({"file_id": file_id})
        
        # 删除物理文件
        file_path = os.path.join(app_settings.UPLOAD_DIR, file_id)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        
        return 1 # 返回 1 表示成功，具体删除了多少个向量难以精确统计，但这不重要
    
    async def get_all_files(self) -> List[Dict]:
        """获取所有文件信息"""
        cursor = self.metadata_collection.find({}, {"_id": 0})
        files = await cursor.to_list(length=None)
        return files


# 全局实例
vector_store_service = VectorStoreService()
