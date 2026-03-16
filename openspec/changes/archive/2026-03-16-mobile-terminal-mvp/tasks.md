## 1. 项目初始化

- [x] 1.1 创建项目根目录结构（frontend/、backend/）
- [x] 1.2 初始化后端项目（Node.js + TypeScript + Fastify + pnpm）
- [x] 1.3 初始化前端项目（React + TypeScript + Vite + pnpm）
- [x] 1.4 配置 Tailwind CSS

## 2. 后端 - 数据库层

- [x] 2.1 实现数据库服务（better-sqlite3 + SQLite）
- [x] 2.2 创建 SSH 连接表
- [x] 2.3 实现加密服务（Node.js crypto）
- [x] 2.4 实现 SSH 连接 CRUD 操作

## 3. 后端 - API 层

- [x] 3.1 创建 Fastify 服务器入口
- [x] 3.2 实现健康检查 API
- [x] 3.3 实现 SSH 连接 REST API（列表、创建、编辑、删除）
- [x] 3.4 实现 user_id（浏览器指纹）验证中间件

## 4. 后端 - WebSocket + SSH 代理

- [x] 4.1 集成 Socket.IO 插件
- [x] 4.2 实现 SSH 客户端服务（ssh2 + PTY）
- [x] 4.3 实现 WebSocket 消息转发
- [x] 4.4 实现 SSH 连接保持和恢复逻辑

## 5. 前端 - 基础组件

- [x] 5.1 实现浏览器指纹 Hook（FingerprintJS2，作为 user_id）
- [x] 5.2 实现 API 客户端
- [x] 5.3 实现连接列表页面
- [x] 5.4 实现连接表单组件（创建/编辑）

## 6. 前端 - Terminal UI

- [x] 6.1 集成 xterm.js 及其插件（fit、web-links）
- [x] 6.2 实现终端组件
- [x] 6.3 实现特殊工具栏（Ctrl, Cmd, Esc, Tab, 方向键）
- [x] 6.4 实现响应式设计适配

## 7. 集成与测试

- [x] 7.1 配置静态文件服务（后端服务前端）
- [x] 7.2 端到端测试（连接 SSH + 使用 tmux）
- [x] 7.3 手机端体验测试
- [x] 7.4 局域网和 Tailscale 访问测试
