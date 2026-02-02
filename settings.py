from llama_index.core import Settings
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.llms.openai import OpenAI
from dotenv import load_dotenv
import os

# 设置默认 LLM
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
api_base = os.getenv("OPENAI_API_BASE")

# 设置默认向量模型
Settings.embed_model = OpenAIEmbedding(
    model="text-embedding-3-small",
    api_key=api_key,
    api_base=api_base,
)

Settings.llm = OpenAI(
    temperature=0.1,
    model="gpt-5-mini",
    api_key=api_key,
    api_base=api_base,
)
