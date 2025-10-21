# 第一阶段：构建前端
FROM node:18-alpine AS frontend-builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --quiet

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 第二阶段：Python运行环境
FROM python:3.11-alpine

WORKDIR /app

# 安装构建依赖（Alpine使用apk）
RUN apk add --no-cache \
    gcc \
    musl-dev \
    linux-headers \
    libffi-dev

# 复制requirements.txt
COPY requirements.txt .

# 安装Python依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制服务器代码
COPY server.py .

# 从前端构建阶段复制dist
COPY --from=frontend-builder /app/dist ./dist

# 创建数据目录
RUN mkdir -p data/files

# 暴露端口
EXPOSE 8080

# 环境变量
ENV PORT=8080 \
    PYTHONUNBUFFERED=1

# 启动
CMD ["python", "server.py"]
