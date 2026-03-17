# 数据库存储优化设计文档

## 概述

当前项目使用内存数据库（`database-memory.ts`）存储SSH连接信息，这导致数据在服务器重启后全部丢失，对开发和使用造成不便。本方案将统一使用SQLite数据库，并通过环境变量配置实现开发、生产环境的数据库隔离。

## 问题分析

### 当前方案的问题
- **数据丢失**：每次服务器重启都会清空所有SSH连接配置
- **开发体验差**：开发过程中需要反复重新创建连接配置
- **维护成本高**：同时维护内存和SQLite两套实现

### 优化后的优势
- **数据持久化**：使用SQLite数据库，数据会永久保存
- **环境隔离**：开发和生产使用不同的数据库文件
- **简化维护**：只需要维护一套SQLite实现

## 设计方案

### 核心思路
1. 移除内存数据库实现（`database-memory.ts`）
2. 统一使用SQLite数据库（`database.ts`）
3. 通过环境变量`DB_FILENAME`配置数据库文件
4. 根据`NODE_ENV`自动选择默认数据库文件

### 数据库文件策略
- **开发环境（development）**：`terminal-dev.db`
- **生产环境（production）**：`terminal.db`
- **测试环境（test）**：`terminal-test.db`

### 改动文件

1. **backend/src/services/database.ts** - 核心数据库实现
2. **backend/src/routes/connections.ts** - API路由
3. **backend/.env.example** - 环境变量示例
4. **backend/.env** - 本地配置文件
5. 删除 **backend/src/services/database-memory.ts**

## 实现细节

### 1. 数据库服务优化
```typescript
// 修改后的 database.ts
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
```

### 2. 环境变量配置
```bash
# .env 配置示例
ENCRYPTION_KEY=your-encryption-key-here
ENCRYPTION_SALT=your-salt-here
PORT=8080
DB_FILENAME=terminal-dev.db  # 可选，默认根据 NODE_ENV 决定
```

### 3. API路由更新
```typescript
// routes/connections.ts
import { db } from '../services/database';  // 改为导入 database.ts
```

## 迁移方案

### 开发环境数据迁移（可选）
1. 如果需要保留现有内存数据库的连接，可以编写脚本导出
2. 或者在首次运行时手动重新创建连接（推荐）

### 生产环境
生产环境将使用全新的 `terminal.db` 文件，确保数据隔离。

## 风险评估

### 数据备份
- 建议定期备份 SQLite 文件
- 在自动部署流程中加入数据库备份步骤

### 性能考虑
SQLite 完全能够满足当前应用的需求，单一用户场景下性能甚至优于内存数据库。

## 验证方案

1. **开发验证**：启动开发服务器，创建连接并重启服务器验证数据是否保留
2. **环境隔离验证**：通过修改 NODE_ENV 验证数据库文件是否正确切换
3. **API验证**：测试所有 CRUD 操作是否正常工作

## 相关文件清单

- **已存在**：
  - backend/src/services/database.ts - SQLite 实现
  - backend/data/ - 数据库文件目录
  - backend/.env.example - 环境变量示例

- **需要创建**：
  - backend/docs/plans/2026-03-17-database-storage-design.md - 本文档

- **需要修改**：
  - backend/src/routes/connections.ts - 导入路径
  - backend/.env - 添加数据库配置

- **需要删除**：
  - backend/src/services/database-memory.ts
