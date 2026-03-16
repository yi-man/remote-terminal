# Remote Terminal

一个专为手机端优化的 Web Terminal 应用，支持 SSH 连接、tmux 会话保持、局域网和 Tailscale 内网穿透访问。

## 功能特性

- 📱 移动端优化的 UI 设计
- 🔗 SSH 连接配置管理（密码/私钥认证）
- 💻 基于 xterm.js 的真实终端体验
- 🔄 tmux 会话保持
- 🔐 密码和私钥加密存储
- 📊 浏览器指纹作为用户唯一标识
- 🚀 高性能后端（Fastify + Socket.IO）

## 技术栈

### 后端
- Node.js 22+
- TypeScript
- Fastify
- Socket.IO
- ssh2
- SQLite + better-sqlite3

### 前端
- React 18
- TypeScript
- Vite
- xterm.js
- Tailwind CSS
- Socket.IO Client

## 快速开始

### 环境要求

- Node.js 22+
- pnpm

### 安装依赖

```bash
# 安装后端依赖
cd backend
pnpm install

# 安装前端依赖
cd ../frontend
pnpm install
```

### 配置环境变量

```bash
cd backend
cp .env.example .env
# 编辑 .env 文件，设置加密密钥
```

### 开发模式

```bash
# 启动后端（终端 1）
cd backend
pnpm dev

# 启动前端（终端 2）
cd frontend
pnpm dev
```

### 构建

```bash
# 构建前端
cd frontend
pnpm build

# 启动后端（服务前端静态文件）
cd backend
pnpm build
pnpm start
```

## 使用说明

### 1. 创建 SSH 连接

- 点击 "新连接" 按钮
- 填写连接信息：名称、主机地址、端口、用户名
- 选择认证方式：密码或 SSH 私钥
- 保存连接配置

### 2. 连接到终端

- 在连接列表中点击 "连接" 按钮
- 使用特殊工具栏（Ctrl, Esc, Tab, 方向键）进行操作
- 支持 tmux 命令保持会话

### 3. 网络访问

- **局域网**：直接使用局域网 IP 访问
- **外网**：使用 Tailscale 实现内网穿透

## 项目结构

```
remote-terminal/
├── frontend/          # 前端代码
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── types/
│   └── package.json
├── backend/           # 后端代码
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── plugins/
│   │   └── types/
│   ├── data/          # SQLite 数据库
│   └── package.json
└── openspec/          # OpenSpec 规范文档
```

## 许可证

MIT
