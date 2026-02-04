# LlamaIndex RAG 系统

基于 LlamaIndex 的智能文档检索与对话系统，采用 NotebookLM 风格的现代化界面设计。

## 技术栈

### 后端
- **Python 3.11+**
- **FastAPI** - 高性能 Web 框架
- **LlamaIndex** - LLM 应用数据框架
- **Qdrant** - 向量数据库
- **Mem0** - 长期记忆管理

### 前端
- **Next.js 16** - React 框架
- **TypeScript** - 类型安全
- **Tailwind CSS 4** - 现代化样式
- **shadcn/ui** - 高质量 UI 组件库
- **Radix UI** - 无障碍组件基础
- **Lucide Icons** - 现代图标库

## 功能特性

### ✨ 核心功能
- 📤 **文件上传管理** - 支持拖拽上传，支持 .txt, .pdf, .docx, .md 格式
- 🔍 **智能文档检索** - 基于向量相似度的语义搜索
- 💬 **智能对话** - 结合上下文的自然语言问答
- 🧠 **长期记忆** - 使用 Mem0 记住用户偏好和对话历史
- 📊 **相关度展示** - 显示检索到的文档片段及相关度分数

### 🎨 界面特点
- 🎯 **NotebookLM 风格** - 简洁专业的三栏布局
- 📐 **三栏结构** - 左侧来源管理、中间对话、右侧信息面板
- 🎨 **极简设计** - 黑白灰配色，清晰的视觉层次
- 📱 **响应式布局** - 完美适配桌面和移动设备
- 🎯 **优秀交互** - 拖拽上传、可折叠源文档、平滑滚动
- ♿ **无障碍支持** - 基于 Radix UI 的可访问性组件

## 快速开始

### 环境要求
- Python 3.11+
- Node.js 18+
- uv (Python 包管理器)
- npm 或 yarn

### 安装依赖

```bash
# 安装 Python 依赖
uv sync

# 安装 Node.js 依赖
cd frontend
npm install
```

### 启动服务

#### 方式一：使用启动脚本（推荐）

```bash
./start.sh
```

#### 方式二：分别启动

```bash
# 启动后端服务（终端 1）
cd backend
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000

# 启动前端服务（终端 2）
cd frontend
npm run dev
```

### 访问地址
- **前端界面**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

## 项目结构

```
llamaindex_demo/
├── backend/                 # 后端服务
│   └── app/
│       ├── api/            # API 路由
│       │   ├── chat.py     # 聊天接口
│       │   └── files.py    # 文件管理接口
│       ├── services/       # 业务逻辑
│       │   ├── agent_service.py       # Agent 服务
│       │   ├── document_processor.py  # 文档处理
│       │   └── vector_store.py        # 向量存储
│       ├── config.py       # 配置管理
│       ├── logger.py       # 日志配置
│       └── main.py         # 应用入口
├── frontend/               # 前端应用
│   ├── app/               # Next.js App Router
│   │   ├── page.tsx       # 主页面
│   │   ├── layout.tsx     # 布局
│   │   └── globals.css    # 全局样式
│   ├── components/        # React 组件
│   │   ├── ui/           # shadcn/ui 组件
│   │   ├── file-upload.tsx   # 文件上传
│   │   ├── file-list.tsx     # 文件列表
│   │   └── chat.tsx          # 聊天界面
│   ├── lib/              # 工具函数
│   └── next.config.ts    # Next.js 配置
├── frontend_old/          # 旧版前端（备份）
├── pyproject.toml         # Python 项目配置
└── README.md             # 项目文档
```

## 配置说明

### 后端配置

在 `backend/app/config.py` 中配置：

- Qdrant 向量数据库连接
- OpenAI API 密钥
- Mem0 记忆配置
- 文件上传设置

### 前端配置

在 `frontend/next.config.ts` 中配置 API 代理：

```typescript
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: "http://localhost:8000/api/:path*",
    },
  ];
}
```

## 使用说明

### 1. 上传文档

在"文件管理"标签页：
- 点击或拖拽文件到上传区域
- 支持的格式：.txt, .pdf, .docx, .md
- 单个文件最大 15MB

### 2. 智能对话

在"智能对话"标签页：
- 选择要查询的文档（默认全选）
- 输入问题，系统会从选中的文档中检索相关信息
- 查看 AI 回答及引用的文档片段
- 展开/折叠源文档查看完整内容

### 3. 长期记忆

系统会自动记住：
- 用户的偏好和习惯
- 历史对话内容
- 个性化的交互方式

## 开发指南

### 添加新的 UI 组件

使用 shadcn/ui CLI：

```bash
cd frontend
npx shadcn@latest add [component-name]
```

### 后端 API 开发

1. 在 `backend/app/api/` 创建新的路由文件
2. 在 `backend/app/services/` 实现业务逻辑
3. 在 `backend/app/main.py` 注册路由

### 前端组件开发

1. 在 `frontend/components/` 创建新组件
2. 使用 TypeScript 和 Tailwind CSS
3. 遵循 shadcn/ui 的设计系统

## 注意事项

- 确保 Qdrant 向量数据库已启动
- 配置正确的 OpenAI API 密钥
- 首次运行需要等待依赖安装完成
- 建议使用 Chrome 或 Firefox 浏览器

## 相关文档

- [LlamaIndex 官方文档](https://docs.llamaindex.ai/)
- [Next.js 文档](https://nextjs.org/docs)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

## License

MIT
