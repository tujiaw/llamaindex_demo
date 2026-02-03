import uvicorn
import os

# 设置 Python 警告过滤器，过滤第三方库的弃用警告
# 这些警告来自 mem0ai 内部使用的已弃用 Pydantic V1 API
# 项目本身的代码已经升级到 Pydantic V2 标准
os.environ.setdefault('PYTHONWARNINGS', 'ignore::DeprecationWarning')

if __name__ == "__main__":
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8001, reload=True)
