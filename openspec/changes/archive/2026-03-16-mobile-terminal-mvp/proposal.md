## Why

用户需要一个手机端的 Terminal 应用，能够从任何设备（手机、平板、网页）连接到 Mac 终端，支持使用 tmux 保持会话，并通过局域网或 Tailscale 内网穿透访问。现有的解决方案要么功能过于复杂，要么缺乏移动端优化。

## What Changes

- 创建一个轻量级的 Web Terminal 应用，专门为移动端优化
- 支持 SSH 连接管理（保存/加载连接配置）
- 实现类似 macOS Terminal 的界面体验（使用 xterm.js）
- 支持 tmux 命令保持会话
- 提供手机端特殊工具栏（Ctrl, Cmd, Esc, Tab, 方向键）
- 使用浏览器指纹（FingerprintJS2）作为用户唯一标识
- 连接配置加密存储在后端 SQLite 数据库中

## Capabilities

### New Capabilities

- `ssh-connections`: SSH 连接配置管理，包括创建、编辑、删除、列表显示
- `terminal-ui`: 基于 xterm.js 的终端界面，支持移动端输入
- `websocket-proxy`: 通过 WebSocket 代理 SSH 通信
- `browser-fingerprint`: 浏览器指纹识别，用于用户身份验证
- `tmux-integration`: 支持 tmux 会话管理

### Modified Capabilities

无

## Impact

**前端**: React + TypeScript + xterm.js + FingerprintJS2 + Socket.IO Client + pnpm
**后端**: Node.js 22 + TypeScript + Fastify + Socket.IO + ssh2 + SQLite + pnpm
**部署**: Mac 本地运行，或云端服务器

**依赖变更**:
- 新增前端依赖：xterm.js, @xterm/addon-fit, @xterm/addon-web-links, fingerprintjs2, socket.io-client, tailwindcss
- 新增后端依赖：fastify, @fastify/socket.io, @fastify/static, ssh2, better-sqlite3, zod
