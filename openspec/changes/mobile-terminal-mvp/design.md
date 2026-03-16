## Context

我们需要构建一个适合手机端的 Web Terminal 应用。目前没有简单、轻量且专为移动端优化的解决方案。项目从 MVP 开始，先实现 Web 端，将来扩展到 iOS 和 Android 原生应用。

**当前状态**: 全新项目，从零开始构建。

**约束条件**:
- 技术栈: Node.js 22 + TypeScript + React + Socket.IO + xterm.js + SQLite
- 后端框架: Fastify（性能优先）
- 部署: 优先考虑 Mac 本地运行

## Goals / Non-Goals

**Goals:**
- 提供流畅的手机端 Terminal 体验
- 支持 SSH 连接配置管理
- 与 tmux 无缝集成
- 通过局域网或 Tailscale 访问

**Non-Goals:**
- 用户认证（MVP 版本使用浏览器指纹）
- 多用户支持（MVP 版本单用户）
- 云端部署（MVP 优先本地部署）

## Decisions

### 1. 架构选择: 前后端分离 + WebSocket 代理

```
┌─────────────────────────────────────────────────────────┐
│  浏览器 (手机/平板/电脑)                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  React + xterm.js + FingerprintJS2              │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │ WebSocket
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Fastify + Socket.IO + ssh2 + SQLite                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SSH 连接代理 + PTY 伪终端                        │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │ SSH
                          ▼
┌─────────────────────────────────────────────────────────┐
│  目标机器 (Mac) - SSH + tmux                             │
└─────────────────────────────────────────────────────────┘
```

**选择理由**:
- 浏览器无法直接 SSH，必须有后端代理
- WebSocket 提供实时双向通信
- PTY 伪终端处理终端大小调整

### 2. 后端框架: Fastify（而非 Express）

| 选项 | 理由 |
|------|------|
| Fastify | 性能高 2-3 倍，原生 TypeScript 支持，插件生态丰富 |
| Express | 生态更丰富，但性能较低 |

**选择**: Fastify

### 3. 数据库: SQLite（而非 PostgreSQL/MySQL）

| 选项 | 理由 |
|------|------|
| SQLite | 轻量，无服务器，适合单用户场景，文件存储 |
| PostgreSQL/MySQL | 功能强大，但过于复杂，需要服务器 |

**选择**: SQLite + better-sqlite3（同步 API，简单可靠）

### 4. 用户标识: 浏览器指纹（user_id）（而非用户认证）

| 选项 | 理由 |
|------|------|
| FingerprintJS2（作为 user_id） | 无密码，无注册，单用户场景足够 |
| 用户认证 | 更安全，但增加复杂度，MVP 不需要 |

**选择**: FingerprintJS2 生成 user_id

### 5. 前端构建工具: Vite（而非 Webpack）

| 选项 | 理由 |
|------|------|
| Vite | 开发服务器启动快，HMR 快，原生 ESM 支持 |
| Webpack | 生态更丰富，但配置复杂，启动慢 |

**选择**: Vite

### 6. 前端样式: Tailwind CSS（而非 CSS-in-JS）

| 选项 | 理由 |
|------|------|
| Tailwind CSS | 快速开发，响应式设计简单，无需编写 CSS |
| CSS-in-JS | 更灵活，但增加复杂度，MVP 不需要 |

**选择**: Tailwind CSS

## 数据模型

### SQLite 表结构

```sql
CREATE TABLE ssh_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL DEFAULT 22,
  username TEXT NOT NULL,
  auth_type TEXT NOT NULL CHECK (auth_type IN ('password', 'privateKey')),
  password TEXT,
  private_key TEXT,
  passphrase TEXT,
  terminal_type TEXT DEFAULT 'xterm-256color',
  font_size INTEGER DEFAULT 14,
  theme TEXT DEFAULT 'dark',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_used_at INTEGER
);

CREATE INDEX idx_ssh_connections_user_id ON ssh_connections(user_id);
```

## 项目结构

```
remote-terminal/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConnectionList.tsx      # 连接列表
│   │   │   ├── ConnectionForm.tsx      # 连接表单
│   │   │   ├── Terminal.tsx            # 终端组件
│   │   │   └── Toolbar.tsx             # 特殊工具栏
│   │   ├── hooks/
│   │   │   ├── useUserId.ts            # 用户标识（浏览器指纹）
│   │   │   ├── useWebSocket.ts         # WebSocket 连接
│   │   │   └── useSSHConnections.ts    # SSH 连接管理
│   │   ├── api/
│   │   │   └── client.ts                # API 客户端
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript 类型
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend/
│   ├── src/
│   │   ├── plugins/
│   │   │   ├── socket.io.ts            # Socket.IO 插件
│   │   │   └── static.ts               # 静态文件插件
│   │   ├── routes/
│   │   │   ├── connections.ts          # SSH 连接 API
│   │   │   └── health.ts               # 健康检查
│   │   ├── services/
│   │   │   ├── ssh.ts                  # SSH 服务
│   │   │   ├── database.ts             # 数据库服务
│   │   │   └── crypto.ts               # 加密服务
│   │   ├── types/
│   │   │   └── index.ts                 # TypeScript 类型
│   │   └── server.ts                    # 服务器入口
│   ├── package.json
│   ├── tsconfig.json
│   └── data/
│       └── terminal.db                  # SQLite 数据库
└── openspec/
    └── changes/
        └── mobile-terminal-mvp/
```

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| user_id 冲突 | 使用高质量的 FingerprintJS2 库，冲突率低 |
| 密码/私钥存储安全 | 使用 Node.js crypto 加密存储，密钥从环境变量读取 |
| WebSocket 断开重连 | 前端自动重连，后端保持 SSH 连接一段时间 |
| 手机端输入体验 | 提供特殊工具栏，优化虚拟键盘支持 |
| 终端大小调整 | 监听窗口大小变化，调用 xterm.js fit 插件 |

## Migration Plan

MVP 版本无迁移计划，从零开始部署。

## Open Questions

无。所有决策已在讨论中确定。
