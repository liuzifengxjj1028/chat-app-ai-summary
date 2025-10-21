# 使用多阶段构建
FROM node:18-alpine AS frontend-builder

# 设置工作目录
WORKDIR /app

# 复制前端依赖文件
COPY package*.json ./

# 安装前端依赖
RUN npm ci

# 复制前端源代码
COPY . .

# 构建前端
RUN npm run build

# 第二阶段：Python运行环境
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖（包括构建工具）
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制Python依赖文件
COPY requirements.txt .

# 升级pip并安装Python依赖
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY server.py .

# 从前端构建阶段复制构建产物
COPY --from=frontend-builder /app/dist ./dist

# 创建数据目录
RUN mkdir -p data/files

# 暴露端口
EXPOSE 8080

# 设置环境变量
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# 启动命令
CMD ["python", "server.py"]
