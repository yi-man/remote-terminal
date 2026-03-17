# 数据库存储优化实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将项目从内存数据库切换到SQLite数据库，实现数据持久化和环境隔离

**Architecture:** 移除内存数据库实现，统一使用SQLite数据库。通过环境变量`DB_FILENAME`配置不同数据库文件，默认根据`NODE_ENV`选择：开发(terminal-dev.db)、生产(terminal.db)、测试(terminal-test.db)。

**Tech Stack:** TypeScript, SQLite, better-sqlite3, Node.js

---

## 任务清单

### Task 1: 更新 database.ts - 支持环境变量配置数据库文件

**Files:**
- Modify: `/Users/xxwade/mine/claude-code-projects/remote-terminal/backend/src/services/database.ts`

**Step 1: 修改数据库文件路径配置**

```typescript
// 更新后的 database.ts
import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SSHConnection, CreateSSHConnection, UpdateSSHConnection } from '../types';
import { encrypt, decrypt } from './crypto';

// 确保 data/ 目录存在
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 根据环境变量或 NODE_ENV 选择数据库文件
const DEFAULT_DB_FILENAMES = {
  development: 'terminal-dev.db',
  production: 'terminal.db',
  test: 'terminal-test.db'
};

const DB_FILENAME = process.env.DB_FILENAME ||
  DEFAULT_DB_FILENAMES[process.env.NODE_ENV || 'development'];

const DB_PATH = path.join(DATA_DIR, DB_FILENAME);

class DatabaseService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  // 以下代码保持不变...
```

**Step 2: 验证修改**

检查是否正确导入了 `fs`, `path` 模块，确保目录创建逻辑正确。

**Step 3: Commit**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
git add src/services/database.ts
git commit -m "feat: 支持环境变量配置数据库文件路径"
```

---

### Task 2: 更新 connections.ts - 替换数据库导入

**Files:**
- Modify: `/Users/xxwade/mine/claude-code-projects/remote-terminal/backend/src/routes/connections.ts:1-4`

**Step 1: 修改导入语句**

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../services/database';  // 改为导入 database.ts
import type { CreateSSHConnection, UpdateSSHConnection } from '../types';
```

**Step 2: 验证修改**

确保没有其他地方使用了 `database-memory`。

**Step 3: Commit**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
git add src/routes/connections.ts
git commit -m "refactor: 替换数据库导入为SQLite实现"
```

---

### Task 3: 更新 socket.io.ts - 替换数据库导入

**Files:**
- Modify: `/Users/xxwade/mine/claude-code-projects/remote-terminal/backend/src/plugins/socket.io.ts:1-5`

**Step 1: 修改导入语句**

```typescript
import { FastifyInstance } from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import { db } from '../services/database';  // 改为导入 database.ts
import { SSHClient } from '../services/ssh';
import { sessionManager } from '../services/session-manager';
```

**Step 2: 验证修改**

**Step 3: Commit**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
git add src/plugins/socket.io.ts
git commit -m "refactor: socket.io插件替换数据库导入"
```

---

### Task 4: 更新 .env.example - 添加数据库配置

**Files:**
- Modify: `/Users/xxwade/mine/claude-code-projects/remote-terminal/backend/.env.example`

**Step 1: 添加环境变量配置**

```bash
# Encryption settings
ENCRYPTION_KEY=your-32-byte-secret-key-here
ENCRYPTION_SALT=your-salt-here

# Server settings
PORT=8080

# Database settings
# 默认值: development=terminal-dev.db, production=terminal.db, test=terminal-test.db
# DB_FILENAME=terminal.db
```

**Step 2: 更新本地 .env 文件**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
cp .env.example .env
```

**Step 3: Commit**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
git add .env.example
git commit -m "docs: 添加数据库文件路径配置说明"
```

---

### Task 5: 更新 .env - 配置开发环境数据库

**Files:**
- Modify: `/Users/xxwade/mine/claude-code-projects/remote-terminal/backend/.env`

**Step 1: 添加数据库配置**

```bash
# Encryption settings
ENCRYPTION_KEY=your-32-byte-secret-key-here
ENCRYPTION_SALT=your-salt-here

# Server settings
PORT=8080

# Database settings
DB_FILENAME=terminal-dev.db
```

**Step 2: Commit**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
git add .env
git commit -m "chore: 配置开发环境数据库文件"
```

---

### Task 6: 验证 connections 测试 - 更新测试导入

**Files:**
- Modify: `/Users/xxwade/mine/claude-code-projects/remote-terminal/backend/src/__tests__/connections.test.ts`

**Step 1: 修改测试文件导入**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { connectionRoutes } from '../routes/connections';
import { db } from '../services/database';  // 改为导入 database.ts
import type { CreateSSHConnection } from '../types';
```

**Step 2: 验证测试是否通过**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
NODE_ENV=test pnpm test:run src/__tests__/connections.test.ts
```

**Step 3: Commit**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
git add src/__tests__/connections.test.ts
git commit -m "test: 更新数据库导入"
```

---

### Task 7: 删除 database-memory.ts - 清理内存数据库

**Files:**
- Delete: `/Users/xxwade/mine/claude-code-projects/remote-terminal/backend/src/services/database-memory.ts`

**Step 1: 删除文件**

```bash
rm /Users/xxwade/mine/claude-code-projects/remote-terminal/backend/src/services/database-memory.ts
```

**Step 2: Commit**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
git add -u
git commit -m "refactor: 移除内存数据库实现"
```

---

### Task 8: 验证项目能否正常启动

**Step 1: 安装依赖（如需要）**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
pnpm install
```

**Step 2: 启动开发服务器**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
pnpm dev
```

**预期输出:**
- Server running on http://0.0.0.0:8080
- 检查 data/ 目录是否创建了 terminal-dev.db 文件

**Step 3: 测试 API**

```bash
# 使用 curl 测试获取连接列表
curl -H "x-user-id: test-user" http://localhost:8080/api/connections
```

**预期输出:**
```json
{"success":true,"data":[]}
```

---

### Task 9: 验证生产环境配置

**Step 1: 测试生产环境**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
NODE_ENV=production DB_FILENAME=terminal.db pnpm dev
```

**预期输出:**
- 使用 terminal.db 数据库文件

**Step 2: 测试测试环境**

```bash
cd /Users/xxwade/mine/claude-code-projects/remote-terminal/backend
NODE_ENV=test DB_FILENAME=terminal-test.db pnpm test:run
```

**预期输出:**
- 所有测试通过

---

## 验证清单

✅ 数据库文件根据 NODE_ENV 自动选择
✅ 支持 DB_FILENAME 环境变量指定
✅ data/ 目录自动创建
✅ 开发环境使用 terminal-dev.db
✅ 生产环境使用 terminal.db
✅ 测试环境使用 terminal-test.db
✅ API 路由正常工作
✅ Socket.IO 功能正常
✅ 所有测试通过

---

## 总结

本实现计划将项目从内存数据库切换到SQLite数据库，实现了数据持久化和环境隔离。通过统一使用SQLite，减少了维护成本，并遵循了常见的开发最佳实践。
