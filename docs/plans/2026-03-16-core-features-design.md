# 核心功能实现设计文档

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**项目:** Remote Terminal MVP 核心功能实现
**日期:** 2026-03-16
**目标:** 实现 Socket.IO WebSocket、真实 SSH 连接、会话保持等核心功能

---

## 概述

基于原始设计文档和测试报告，当前项目的基础框架已完成，但核心功能（WebSocket、SSH 连接、终端通信）是占位符实现。本文档设计实现这些核心功能。

## 架构

### 总体架构

```
┌─────────────────────────────────────────────────────────┐
│  浏览器 (手机/平板/电脑)                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  React + xterm.js + Socket.IO Client            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │ WebSocket (Socket.IO)
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Fastify + Socket.IO + ssh2 + SQLite                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SSH 连接代理 + PTY 伪终端 + 会话管理            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │ SSH
                          ▼
┌─────────────────────────────────────────────────────────┐
│  目标机器 (Mac) - SSH + tmux                             │
└─────────────────────────────────────────────────────────┘
```

### 组件架构

#### 后端组件

| 组件 | 路径 | 职责 |
|------|------|------|
| Socket.IO 插件 | `backend/src/plugins/socket.io.ts` | WebSocket 连接管理、消息路由 |
| SSH 服务 | `backend/src/services/ssh.ts` | SSH 连接、PTY 分配、终端数据传输 |
| 会话管理器 | `backend/src/services/session-manager.ts` | 会话保持、会话恢复、超时清理 |
| 数据库服务 | `backend/src/services/database-memory.ts` | SSH 配置读取（已存在） |
| 加密服务 | `backend/src/services/crypto.ts` | 密码/私钥解密（已存在） |

#### 前端组件

| 组件 | 路径 | 职责 |
|------|------|------|
| WebSocket Hook | `frontend/src/hooks/useWebSocket.ts` | Socket.IO 客户端、连接管理 |
| 终端组件 | `frontend/src/components/Terminal.tsx` | xterm.js 集成、终端 UI（需更新） |
| API 客户端 | `frontend/src/api/client.ts` | REST API 调用（已存在） |

## 数据流程

### 1. 连接建立流程

```
1. 前端用户点击连接
   ↓
2. 前端: 建立 Socket.IO 连接，发送 { connectionId, userId }
   ↓
3. 后端: 验证参数，从数据库读取 SSH 配置
   ↓
4. 后端: 解密密码/私钥
   ↓
5. 后端: 建立 SSH 连接（ssh2）
   ↓
6. 后端: 分配 PTY 伪终端
   ↓
7. 后端: 创建 Shell 会话
   ↓
8. 后端: 发送 "connected" 事件给前端
   ↓
9. 前端: 显示连接成功，开始终端交互
```

### 2. 终端数据传输流程

```
用户输入 → xterm.js onData → WebSocket send
                                    ↓
                           后端接收消息
                                    ↓
                           写入 SSH PTY stdin
                                    ↓
                           SSH 服务器处理
                                    ↓
                           从 SSH PTY stdout 读取
                                    ↓
                           WebSocket emit 到前端
                                    ↓
                           xterm.js write 显示
```

### 3. 会话保持与恢复流程

```
WebSocket 断开
    ↓
后端: 启动 10 分钟超时定时器
    ↓
后端: SSH 连接保持，PTY 保持
    ↓
用户重新连接
    ↓
后端: 通过 sessionId 查找会话
    ↓
后端: 恢复 WebSocket 与 PTY 的绑定
    ↓
继续终端数据传输
```

## 技术栈

- **后端**: Node.js 22 + TypeScript + Fastify
- **WebSocket**: Socket.IO (fastify-socket.io)
- **SSH**: ssh2 (Node.js SSH 客户端)
- **前端**: React 18 + TypeScript + Vite
- **终端 UI**: xterm.js + @xterm/addon-fit

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| SSH 连接失败 | 提供清晰的错误信息，允许重试 |
| WebSocket 断开 | 前端自动重连，后端会话保持 |
| 密码/私钥安全 | 传输时解密，用完即丢弃，不保留在内存 |
| 会话内存泄漏 | 超时后强制清理，限制最大并发会话数 |

---

## 文件清单

### 需要创建/修改的文件

**后端:**
- 创建: `backend/src/services/session-manager.ts` - 会话管理器
- 修改: `backend/src/plugins/socket.io.ts` - Socket.IO 插件实现
- 修改: `backend/src/services/ssh.ts` - SSH 服务真实实现
- 修改: `backend/src/server.ts` - 注册 Socket.IO 插件
- 修改: `backend/package.json` - 确保依赖已安装

**前端:**
- 创建: `frontend/src/hooks/useWebSocket.ts` - WebSocket Hook
- 修改: `frontend/src/components/Terminal.tsx` - 集成 WebSocket
- 修改: `frontend/package.json` - 确保 socket.io-client 已安装
