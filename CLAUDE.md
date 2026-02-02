# 项目规范

## 开发工具

**总是使用 `uv` 工具进行 Python 包管理和依赖管理。**

- 使用 `uv pip install` 安装依赖
- 使用 `uv pip uninstall` 卸载依赖
- 使用 `uv pip list` 列出已安装的包
- 使用 `uv pip freeze` 冻结依赖版本

## 框架

**本项目使用 LlamaIndex 框架。**

LlamaIndex 是一个用于构建大型语言模型(LLM)应用的数据框架，提供：
- 文档索引和检索
- 数据连接器
- 查询接口
- 与各种 LLM 的集成

## 相关资源

- LlamaIndex 官方文档: https://docs.llamaindex.ai/
- LlamaIndex GitHub: https://github.com/run-llama/llama_index
- uv 工具文档: https://github.com/astral-sh/uv
