```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

## 项目概述

Remote Terminal 是一个专为手机端优化的 Web 终端应用，支持 SSH 连接、tmux 会话保持、局域网和 Tailscale 内网穿透访问。

**核心功能**:
- 移动端优化的 UI 设计
- SSH 连接配置管理（密码/私钥认证）
- 基于 xterm.js 的真实终端体验
- tmux 会话保持
- 密码和私钥加密存储
- 浏览器指纹作为用户唯一标识
- 高性能后端（Fastify + Socket.IO）

## 技术栈

### 前端
- React 18 + TypeScript
- Vite（构建工具）
- xterm.js（终端模拟器）
- Tailwind CSS（样式）
- Socket.IO Client（实时通信）
- FingerprintJS2（浏览器指纹识别）

### 后端
- Node.js 22+ + TypeScript
- Fastify（Web 框架）
- Socket.IO（实时通信）
- ssh2（SSH 实现）
- SQLite + better-sqlite3（数据库）

## 项目结构

```
remote-terminal/
├── frontend/
│   ├── src/
│   │   ├── components/          # React 组件（Terminal、ConnectionForm 等）
│   │   ├── hooks/              # 自定义钩子（useUserId、useSSHConnections、useWebSocket）
│   │   ├── api/                # API 端点和 socket 通信
│   │   └── types/              # TypeScript 类型定义
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/             # HTTP API 路由
│   │   ├── services/           # 核心业务逻辑（SSH、会话管理、数据库）
│   │   ├── plugins/           # Fastify 插件（Socket.IO、静态文件服务）
│   │   └── types/             # TypeScript 类型定义
│   ├── data/                  # SQLite 数据库文件
│   └── package.json
└── openspec/                  # OpenSpec 规范文档
```

## 开发命令

### 安装依赖
```bash
# 安装后端依赖
cd backend
pnpm install

# 安装前端依赖
cd ../frontend
pnpm install
```

### 开发模式

**重要提示：** 调试时经常会出现端口冲突问题，因为之前启动的服务器进程没有完全停止。解决方法：

1. 先停止当前运行的服务器（按 Ctrl+C）
2. 检查并杀死占用端口的进程
3. 重新启动服务器

```bash
# 检查占用 8080 端口的进程（后端）
lsof -ti :8080 | xargs -r kill -9

# 检查占用 5173 端口的进程（前端）
lsof -ti :5173 | xargs -r kill -9

# 启动后端（端口 8080）
cd backend
pnpm dev

# 启动前端（端口 5173）
cd frontend
pnpm dev
```

### 构建
```bash
# 构建前端
cd frontend
pnpm build

# 构建后端
cd backend
pnpm build

# 启动生产服务器（服务前端静态文件）
pnpm start
```

### 测试
```bash
# 运行后端测试（Vitest）
cd backend
pnpm test          # 监听模式运行测试
pnpm test:run      # 运行所有测试一次
```

## 配置

### 环境变量（后端）
1. 在后端目录复制 `.env.example` 为 `.env`
2. 设置加密密钥：`ENCRYPTION_KEY=your-encryption-key`

## 核心架构组件

### 前端

**主要组件：**
- `App.tsx`: 应用根组件，管理视图切换（列表、创建、编辑、终端）
- `Terminal.tsx`: xterm.js 集成 Socket.IO 通信
- `ConnectionList.tsx`: SSH 连接列表管理
- `ConnectionForm.tsx`: 连接创建/编辑表单
- `Toolbar.tsx`: 终端控制工具栏（Ctrl、Esc、Tab、方向键）

**自定义钩子：**
- `useUserId`: 基于浏览器指纹的用户识别
- `useSSHConnections`: 通过 REST API 进行连接 CRUD 操作
- `useWebSocket`: Socket.IO 连接管理

### 后端

**服务：**
- `ssh.ts`: 使用 ssh2 库的 SSH 客户端实现
- `session-manager.ts`: 会话管理，包含超时逻辑（10分钟无活动）
- `database.ts`: SQLite 数据库操作
- `crypto.ts`: 敏感数据加密/解密

**插件：**
- `socket.io.ts`: 用于实时终端通信的 Socket.IO 集成
- `static.ts`: 静态文件服务

**路由：**
- `/health`: 健康检查端点
- `/api/connections`: SSH 连接 CRUD 操作

## API 端点

### SSH 连接
- `GET /api/connections`: 列出用户的所有连接
- `POST /api/connections`: 创建新连接
- `PUT /api/connections/:id`: 更新现有连接
- `DELETE /api/connections/:id`: 删除连接

## 实时通信（Socket.IO）

### 事件
- `connect-ssh`: 建立 SSH 连接
- `data`: 终端输出/输入
- `resize`: 终端 resize
- `error`: 错误消息
- `connected`: 连接成功

## 数据库模式

**SSH 连接表：**
- `id`: 唯一标识符
- `user_id`: 基于浏览器指纹的用户 ID
- `name`: 连接名称
- `host`: 主机地址
- `port`: 端口号（默认：22）
- `username`: SSH 用户名
- `auth_type`: 'password' 或 'privateKey'
- `password`: 加密密码（如果使用密码认证）
- `private_key`: 加密私钥（如果使用私钥认证）
- `passphrase`: 加密密码短语（如果密钥有密码短语）
- `created_at`, `updated_at`, `last_used_at`: 时间戳

## 常见问题

### 端口冲突

**问题：** 调试时经常出现端口冲突，因为之前的服务器进程没有正确停止。

**解决方案：**

```bash
# 检查并杀死占用后端端口（8080）的进程
lsof -ti :8080 | xargs -r kill -9

# 检查并杀死占用前端端口（5173）的进程
lsof -ti :5173 | xargs -r kill -9
```

**预防措施：**
1. 每次重启服务器前，确保先按 Ctrl+C 停止当前进程
2. 使用上述命令检查并清理残留进程
3. 不要随意修改代码中的端口配置
