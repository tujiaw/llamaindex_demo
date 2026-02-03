#!/bin/bash

# LlamaIndex RAG 系统启动脚本

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}  LlamaIndex RAG 系统启动中...${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""

# 检查是否已经有进程在运行
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✓ 后端服务已经在运行 (端口 8000)${NC}"
else
    echo -e "${BLUE}启动后端服务...${NC}"
    cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ 后端服务已启动 (PID: $BACKEND_PID)${NC}"
fi

sleep 2

# 检查前端是否已经在运行
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${GREEN}✓ 前端服务已经在运行 (端口 3000)${NC}"
else
    echo -e "${BLUE}启动前端服务...${NC}"
    cd frontend && npm run dev &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ 前端服务已启动 (PID: $FRONTEND_PID)${NC}"
fi

echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${GREEN}✓ 系统启动完成！${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "前端访问地址: ${GREEN}http://localhost:3000${NC}"
echo -e "后端 API 地址: ${GREEN}http://localhost:8000${NC}"
echo -e "API 文档地址: ${GREEN}http://localhost:8000/docs${NC}"
echo ""
echo -e "按 ${GREEN}Ctrl+C${NC} 停止所有服务"
echo ""

# 等待用户中断
wait
