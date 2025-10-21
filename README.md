# 聊天应用 - AI总结功能

一个支持实时聊天和AI聊天总结的Web应用。

## 功能特性

### 核心功能
- 💬 实时聊天（WebSocket）
- 📁 文件上传和下载
- 📝 文本聊天记录导入
- 🤖 AI聊天总结（支持Claude API）
- 🔍 可点击的总结句子跳转到对应消息

### AI总结功能
- 支持自定义时间范围
- 支持自定义prompt
- 结构化总结，每个句子可追溯到原始消息
- 点击总结中的句子自动跳转到对应的聊天气泡
- 消息高亮闪烁提示

### 群聊分析
- 导入群聊记录
- 选择用户视角查看对话
- 参与者统计
- 关键词提取

## 技术栈

### 前端
- React + TypeScript
- Vite
- TailwindCSS
- Lucide Icons
- WebSocket Client

### 后端
- Python 3.13
- aiohttp (异步Web框架)
- WebSocket服务器
- Anthropic Claude API

## 安装和运行

### 前端

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### 后端

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 设置API密钥（可选）
export ANTHROPIC_API_KEY="your-api-key"

python3 server.py
```

后端运行在 http://localhost:8080

## 使用说明

1. **登录** - 输入用户名登录
2. **聊天** - 选择联系人开始聊天
3. **导入聊天记录** - 从左侧菜单导入文本格式的聊天记录
4. **AI总结** - 点击"AI聊天总结"按钮生成总结
5. **交互式总结** - 点击总结中的句子跳转到对应消息

## 聊天记录格式

支持以下文本格式：

```
用户名 2025年10月22日 12:00
消息内容

用户名 YYYY年MM月DD日 HH:MM
消息内容
```

## 项目结构

```
.
├── src/                    # 前端源代码
│   ├── components/         # React组件
│   ├── services/          # 服务层
│   └── main.tsx           # 入口文件
├── server.py              # Python后端服务器
├── requirements.txt       # Python依赖
├── package.json           # Node.js依赖
└── README.md             # 项目说明
```

## 环境变量

- `ANTHROPIC_API_KEY` - Claude API密钥（可选，没有则使用mock数据）

## 开发说明

- 前端使用Vite的HMR进行热更新
- 后端支持WebSocket实时通信
- AI总结支持JSON结构化输出，包含消息引用

## License

MIT

## 部署到Railway

### 方式一：通过Railway网站部署（推荐）

1. **访问Railway** - https://railway.app
2. **登录/注册** - 使用GitHub账号登录
3. **新建项目** - 点击"New Project"
4. **从GitHub部署**:
   - 选择"Deploy from GitHub repo"
   - 选择 `chat-app-ai-summary` 仓库
   - Railway会自动检测Dockerfile并开始构建

5. **配置环境变量**:
   - 进入项目设置 > Variables
   - 添加环境变量：
     - `ANTHROPIC_API_KEY`: 你的Claude API密钥（可选）
     - `PORT`: `8080` (Railway会自动设置)

6. **部署完成**:
   - 等待构建完成（首次约3-5分钟）
   - 点击"Generate Domain"生成公网访问地址
   - 访问生成的URL即可使用

### 方式二：使用Railway CLI

```bash
# 安装Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 初始化项目
railway init

# 部署
railway up

# 设置环境变量
railway variables set ANTHROPIC_API_KEY=your-api-key

# 生成域名
railway domain
```

### 部署说明

- ✅ 使用Dockerfile自动构建前后端
- ✅ 前端自动打包到dist目录
- ✅ 单一容器同时运行前后端
- ✅ 支持WebSocket连接
- ✅ 自动HTTPS和域名

### 注意事项

1. **免费计划**限制：
   - 每月500小时运行时间
   - 有限的资源配额
   - 详见：https://railway.app/pricing

2. **数据持久化**：
   - 默认配置文件存储在容器内，重启会丢失
   - 如需持久化，需配置Railway Volume

3. **环境变量**：
   - 必须在Railway设置中配置`ANTHROPIC_API_KEY`
   - 如不配置，将使用mock总结功能
