from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext, Settings
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.storage.docstore.mongodb import MongoDocumentStore
from llama_index.storage.index_store.mongodb import MongoIndexStore
from qdrant_client import AsyncQdrantClient
import asyncio
import settings

# ==================== 配置 ====================
QDRANT_HOST = "10.10.107.57"
QDRANT_PORT = 6333
QDRANT_COLLECTION = "llamaindex_demo"

# MongoDB 配置（需要安装：pip install llama-index-storage-docstore-mongodb llama-index-storage-index-store-mongodb）
# Docker 容器配置：docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=admin123 -v mongodb_data:/data/db mongo:latest
MONGO_URI = "mongodb://admin:admin123@10.10.107.57:27017"
MONGO_DB = "llamaindex_db"

# ==================== 初始化远程存储 ====================

# 1. Qdrant 向量存储（只使用异步客户端）
qdrant_aclient = AsyncQdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
vector_store = QdrantVectorStore(
    aclient=qdrant_aclient,
    collection_name=QDRANT_COLLECTION,
    enable_hybrid=False,  # 禁用混合搜索以提高启动速度
)

# 2. MongoDB 文档存储
docstore = MongoDocumentStore.from_uri(
    uri=MONGO_URI,
    db_name=MONGO_DB,
    namespace="documents",
)

# 3. MongoDB 索引存储
index_store = MongoIndexStore.from_uri(
    uri=MONGO_URI,
    db_name=MONGO_DB,
    namespace="index_store",
)

# ==================== 创建存储上下文 ====================
storage_context = StorageContext.from_defaults(
    vector_store=vector_store,
    docstore=docstore,
    index_store=index_store,
)

# ==================== 索引管理 ====================
async def check_collection_exists():
    """检查 Qdrant 集合是否存在"""
    try:
        await qdrant_aclient.get_collection(QDRANT_COLLECTION)
        return True
    except Exception:
        return False

async def create_or_load_index():
    """创建或加载索引，完全使用远程存储"""
    if await check_collection_exists():
        print("从远程存储加载索引...")
        # 从远程存储加载索引
        index = VectorStoreIndex.from_vector_store(
            vector_store=vector_store,
            storage_context=storage_context,
        )
        print("索引加载完成")
    else:
        print("创建新索引并保存到远程存储...")
        # 加载文档
        documents = SimpleDirectoryReader("data").load_data()
        
        # 创建索引（自动保存到远程存储）
        index = VectorStoreIndex.from_documents(
            documents,
            storage_context=storage_context,
            show_progress=True,
        )
        print("索引已保存到远程存储")
    
    return index

# ==================== Agent 工具函数 ====================
# 全局变量，在 main() 中初始化
query_engine = None

def multiply(a: float, b: float) -> float:
    """Useful for multiplying two numbers."""
    print(f"调用 multiply 函数: {a} * {b}")
    return a * b

async def search_documents(query: str) -> str:
    """用于回答关于文档的自然语言问题。"""
    print(f"搜索文档问题：{query}")
    response = await query_engine.aquery(query)
    print(f"搜索文档结果：{str(response)}")
    return str(response)

# ==================== 创建 Agent ====================
agent = FunctionAgent(
    tools=[multiply, search_documents],
    llm=Settings.llm,
    system_prompt="""你是一个有用的助手，可以执行计算并搜索文档来回答问题。
    你应该优先使用搜索文档来回答问题，请不要捏造数据。""",
)

# ==================== 主函数 ====================
async def main():
    # 异步初始化索引
    global query_engine
    index = await create_or_load_index()
    query_engine = index.as_query_engine()
    
    response = await agent.run(
        "小额零星采购一般单价是多少？另外，7 * 8 等于多少？"
    )
    print("=" * 50)
    print("最终回答：")
    print(response)

if __name__ == "__main__":
    asyncio.run(main())
