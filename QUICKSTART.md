# 🚀 快速启动指南

## 方式一：一键启动（推荐）

在项目根目录运行：

```bash
./start.sh
```

这个脚本会自动完成所有设置并启动前后端服务。

## 方式二：手动启动

### 步骤 1：启动后端服务器

打开一个终端窗口，运行：

```bash
# 安装 Python 依赖（首次运行）
pip3 install -r requirements.txt

# 启动后端 WebSocket 服务器
python3 server.py
```

看到以下输出说明后端启动成功：
```
✅ 实时聊天服务器已启动
🌐 访问地址: http://0.0.0.0:8080
📡 WebSocket: ws://localhost:8080/ws
```

### 步骤 2：启动前端开发服务器

打开另一个终端窗口，运行：

```bash
# 安装前端依赖（首次运行）
npm install

# 启动 Vite 开发服务器
npm run dev
```

看到以下输出说明前端启动成功：
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 步骤 3：访问应用

在浏览器中打开：`http://localhost:5173`

## 测试多用户聊天

1. **打开第一个浏览器窗口**
   - 访问 `http://localhost:5173`
   - 输入昵称，例如："Alice"
   - 点击"进入聊天室"

2. **打开第二个浏览器窗口（隐私模式）**
   - 访问 `http://localhost:5173`
   - 输入不同昵称，例如："Bob"
   - 点击"进入聊天室"

3. **开始聊天**
   - 在 Alice 的窗口，点击左侧联系人列表中的 "Bob"
   - 在 Bob 的窗口，点击左侧联系人列表中的 "Alice"
   - 互相发送消息测试实时通信

## 验证功能

测试以下功能：

- [x] 用户注册（昵称不能重复）
- [x] 实时用户列表更新
- [x] 发送文字消息
- [x] 接收文字消息
- [x] 消息实时显示
- [x] 用户在线/离线状态
- [x] WebSocket 自动重连

## 故障排除

### 问题：无法连接到 WebSocket 服务器

**解决方案：**
1. 确认后端服务器正在运行（查看终端输出）
2. 确认端口 8080 未被其他程序占用
3. 检查浏览器控制台的错误信息

### 问题：前端启动失败

**解决方案：**
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 问题：Python 依赖安装失败

**解决方案：**
```bash
# 使用 pip3 而不是 pip
pip3 install -r requirements.txt

# 或者使用 Python 虚拟环境
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# 或 venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

## 端口说明

- **前端**: `http://localhost:5173` (Vite 开发服务器)
- **后端**: `http://localhost:8080` (Python WebSocket 服务器)
- **WebSocket**: `ws://localhost:8080/ws`

## 停止服务

- **停止前端**: 在前端终端按 `Ctrl + C`
- **停止后端**: 在后端终端按 `Ctrl + C`
- **一键启动方式**: 按 `Ctrl + C` 会自动停止所有服务

---

**享受您的实时聊天应用！** 🎉
