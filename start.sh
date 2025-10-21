#!/bin/bash

echo "🚀 启动实时聊天应用..."
echo ""

# 检查 Python 是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python 3"
    echo "请先安装 Python 3: https://www.python.org/downloads/"
    exit 1
fi

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js"
    echo "请先安装 Node.js: https://nodejs.org/"
    exit 1
fi

# 安装 Python 依赖
echo "📦 安装 Python 依赖..."
pip3 install -r requirements.txt

# 启动后端服务器（后台运行）
echo "🔧 启动后端服务器..."
python3 server.py &
BACKEND_PID=$!
echo "✅ 后端服务器已启动 (PID: $BACKEND_PID)"

# 等待后端启动
sleep 2

# 安装前端依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 启动前端开发服务器
echo "🎨 启动前端开发服务器..."
echo ""
echo "========================================="
echo "✅ 应用启动成功！"
echo "========================================="
echo "前端地址: http://localhost:5173"
echo "后端地址: http://localhost:8080"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "========================================="
echo ""

# 启动前端（会阻塞）
npm run dev

# 当前端停止时，也停止后端
echo ""
echo "🛑 停止后端服务器..."
kill $BACKEND_PID 2>/dev/null
echo "✅ 所有服务已停止"
