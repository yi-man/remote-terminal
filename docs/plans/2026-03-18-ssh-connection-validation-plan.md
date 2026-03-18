# SSH 连接创建/修改类型校验实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 SSH 连接创建和修改功能添加完整的前后端双重类型校验，确保数据完整性和安全性。

**Architecture:** 后端使用 Zod 进行严格验证，前端引入 Zod 保持一致的校验逻辑，在 ConnectionForm 组件中实现实时验证和错误显示。

**Tech Stack:**
- 后端: Node.js + TypeScript + Fastify + Zod
- 前端: React 18 + TypeScript + Zod
- 构建工具: Vite
- 包管理器: pnpm

---

## 任务概览

1. **后端验证增强** - 增强 connections.ts 中的 Zod schema
2. **前端依赖安装** - 安装 Zod 验证库
3. **前端验证 Hook** - 创建与后端一致的验证逻辑
4. **表单组件更新** - 修改 ConnectionForm.tsx 集成验证
5. **测试验证逻辑** - 手动测试验证场景

## Task 1: 增强后端验证逻辑

**Files:**
- Modify: `backend/src/routes/connections.ts`

**Step 1: 增强 createConnectionSchema**

```typescript
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../services/database';
import type { CreateSSHConnection, UpdateSSHConnection } from '../types';

// 增强的基础验证 schema
const baseConnectionSchema = z.object({
  user_id: z.string().min(1, '用户ID不能为空'),
  name: z.string().min(1, '连接名称不能为空').max(100, '连接名称过长'),
  host: z.string()
    .min(1, '主机地址不能为空')
    .refine(val => /^[a-zA-Z0-9.-]+$/.test(val) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val),
    '主机地址格式无效（应为域名或IPv4地址）'),
  port: z.number().int()
    .min(1, '端口必须大于0')
    .max(65535, '端口必须小于65536')
    .default(22),
  username: z.string()
    .min(1, '用户名不能为空')
    .max(100, '用户名过长')
    .refine(val => /^[a-zA-Z0-9_-]+$/.test(val), '用户名格式无效'),
  auth_type: z.enum(['password', 'privateKey'], {
    errorMap: () => ({ message: '认证类型无效' })
  }),
  password: z.string().optional(),
  private_key: z.string().optional(),
  passphrase: z.string().optional(),
  terminal_type: z.string().default('xterm-256color'),
  font_size: z.number().int().min(8).max(32).default(14),
  theme: z.string().default('dark'),
});

// 创建连接时的条件验证
const createConnectionSchema = baseConnectionSchema.refine(data => {
  if (data.auth_type === 'password') {
    return !!data.password && data.password.trim().length > 0;
  }
  if (data.auth_type === 'privateKey') {
    return !!data.private_key && data.private_key.trim().length > 0;
  }
  return true;
}, {
  message: '密码认证需要提供密码，私钥认证需要提供私钥',
  path: ['auth_type']
});

// 更新连接时的条件验证
const updateConnectionSchema = createConnectionSchema.omit({ user_id: true }).partial()
  .refine(data => {
    if (data?.auth_type === 'password') {
      return data.password === undefined || (!!data.password && data.password.trim().length > 0);
    }
    if (data?.auth_type === 'privateKey') {
      return data.private_key === undefined || (!!data.private_key && data.private_key.trim().length > 0);
    }
    return true;
  }, {
    message: '密码认证需要提供密码，私钥认证需要提供私钥',
    path: ['auth_type']
  });
```

**Step 2: 确保路由使用新的 schema**

```typescript
export async function connectionRoutes(app: FastifyInstance) {
  // 获取用户的所有连接 - 保持不变
  app.get('/api/connections', async (req, res) => {
    const user_id = req.headers['x-user-id'] as string;

    if (!user_id) {
      return res.status(400).send({ error: 'x-user-id header is required' });
    }

    const connections = db.getSSHConnectionsByUserId(user_id);

    return {
      success: true,
      data: connections,
    };
  });

  // 创建连接 - 使用新 schema
  app.post('/api/connections', async (req, res) => {
    const body = req.body as unknown;

    try {
      let validated = createConnectionSchema.parse(body);

      if (validated.host && validated.host.includes(':')) {
        const parts = validated.host.split(':');
        validated.host = parts[0];
        if (parts[1] && !isNaN(parseInt(parts[1]))) {
          validated.port = parseInt(parts[1]);
        }
        console.log(`Fixed host format during creation: ${body.host} -> ${validated.host}:${validated.port}`);
      }

      const connection = db.createSSHConnection(validated);

      return {
        success: true,
        data: connection,
      };
    } catch (err: any) {
      return res.status(400).send({
        error: 'Validation error',
        details: err.issues,
      });
    }
  });

  // 更新连接 - 使用新 schema
  app.put('/api/connections/:id', async (req, res) => {
    const { id } = req.params as { id: string };
    const user_id = req.headers['x-user-id'] as string;
    const body = req.body as unknown;

    if (!user_id) {
      return res.status(400).send({ error: 'x-user-id header is required' });
    }

    const existing = db.getSSHConnection(id);

    if (!existing || existing.user_id !== user_id) {
      return res.status(404).send({ error: 'Connection not found' });
    }

    try {
      let validated = updateConnectionSchema.parse(body);

      if (validated.host && validated.host.includes(':')) {
        const parts = validated.host.split(':');
        validated.host = parts[0];
        if (parts[1] && !isNaN(parseInt(parts[1]))) {
          validated.port = parseInt(parts[1]);
        }
        console.log(`Fixed host format during update: ${body.host} -> ${validated.host}:${validated.port}`);
      }

      const updated = db.updateSSHConnection(id, validated);

      return {
        success: true,
        data: updated,
      };
    } catch (err: any) {
      return res.status(400).send({
        error: 'Validation error',
        details: err.issues,
      });
    }
  });

  // 获取单个连接和删除保持不变
  // ... 省略
}
```

**Step 3: 验证后端服务运行**

```bash
cd backend
pnpm dev

# 在另一个终端中测试创建连接接口
curl -X POST http://localhost:8080/api/connections \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{
    "name": "",
    "host": "invalid-host@#",
    "port": 0,
    "username": "",
    "auth_type": "password",
    "password": ""
  }'

# 预期返回 400 状态和验证错误
```

**Step 4: 修复所有错误并确保服务正常**

**Step 5: Commit**

```bash
git add backend/src/routes/connections.ts
git commit -m "enhance: 增强 SSH 连接创建和更新的验证规则"
```

## Task 2: 前端依赖安装

**Files:**
- Modify: `frontend/package.json`

**Step 1: 安装 Zod**

```bash
cd frontend
pnpm add zod
```

**Step 2: 验证安装成功**

检查 `frontend/package.json` 的 `dependencies` 中是否包含 `zod`。

**Step 3: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml
git commit -m "chore: 前端添加 Zod 验证依赖"
```

## Task 3: 创建前端验证 Hook

**Files:**
- Create: `frontend/src/hooks/useSSHConnectionValidation.ts`

**Step 1: 实现与后端一致的验证 schema**

```typescript
import { z } from 'zod';
import type { CreateSSHConnection, UpdateSSHConnection } from '../types';

// 与后端完全一致的验证 schema
const baseConnectionSchema = z.object({
  name: z.string().min(1, '连接名称不能为空').max(100, '连接名称过长'),
  host: z.string()
    .min(1, '主机地址不能为空')
    .refine(val => /^[a-zA-Z0-9.-]+$/.test(val) || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(val),
      '主机地址格式无效'),
  port: z.number().int().min(1).max(65535).default(22),
  username: z.string().min(1, '用户名不能为空').max(100, '用户名过长'),
  auth_type: z.enum(['password', 'privateKey']),
  password: z.string().optional(),
  private_key: z.string().optional(),
  passphrase: z.string().optional(),
  terminal_type: z.string().default('xterm-256color'),
  font_size: z.number().int().min(8).max(32).default(14),
  theme: z.string().default('dark'),
});

export const createConnectionSchema = baseConnectionSchema.refine(data => {
  if (data.auth_type === 'password') {
    return !!data.password && data.password.trim().length > 0;
  }
  if (data.auth_type === 'privateKey') {
    return !!data.private_key && data.private_key.trim().length > 0;
  }
  return true;
}, {
  message: '密码认证需要提供密码，私钥认证需要提供私钥',
  path: ['auth_type']
});

export const updateConnectionSchema = createConnectionSchema.partial()
  .refine(data => {
    if (data?.auth_type === 'password') {
      return data.password === undefined || (!!data.password && data.password.trim().length > 0);
    }
    if (data?.auth_type === 'privateKey') {
      return data.private_key === undefined || (!!data.private_key && data.private_key.trim().length > 0);
    }
    return true;
  }, {
    message: '密码认证需要提供密码，私钥认证需要提供私钥',
    path: ['auth_type']
  });

export const validateSSHConnection = {
  create: (data: any) => createConnectionSchema.safeParse(data),
  update: (data: any) => updateConnectionSchema.safeParse(data),
};

// 获取字段错误信息
export const getFieldErrors = (data: any, fieldName: string) => {
  const result = createConnectionSchema.safeParse(data);
  if (result.success) return null;

  const fieldErrors = result.error.issues
    .filter(issue => issue.path[0] === fieldName)
    .map(issue => issue.message);

  return fieldErrors.length > 0 ? fieldErrors[0] : null;
};
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useSSHConnectionValidation.ts
git commit -m "feat: 添加 SSH 连接验证 Hook"
```

## Task 4: 更新 ConnectionForm.tsx 集成验证

**Files:**
- Modify: `frontend/src/components/ConnectionForm.tsx`

**Step 1: 导入验证 Hook**

```typescript
import React, { useState } from 'react';
import { SSHConnection, CreateSSHConnection, UpdateSSHConnection } from '../types';
import { validateSSHConnection, getFieldErrors } from '../hooks/useSSHConnectionValidation';
```

**Step 2: 集成验证到表单提交**

```typescript
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 前端验证
    const validationResult = validateSSHConnection.create(formData);
    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues
        .map(issue => issue.message)
        .join('\n');
      setError(errorMessages);
      setLoading(false);
      return;
    }

    try {
      await onSubmit(validationResult.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
```

**Step 3: 添加实时字段验证**

```typescript
  // 实时字段验证函数
  const getFormFieldErrors = (fieldName: keyof typeof formData) => {
    const result = validateSSHConnection.create(formData);
    if (result.success) return null;

    const fieldErrors = result.error.issues
      .filter(issue => issue.path[0] === fieldName)
      .map(issue => issue.message);

    return fieldErrors.length > 0 ? fieldErrors[0] : null;
  };
```

**Step 4: 更新表单字段以显示错误**

```typescript
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">
        {connection ? '编辑连接' : '创建新连接'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            连接名称
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('name') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="例如：我的 Mac"
          />
          {getFormFieldErrors('name') && (
            <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('name')}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            主机地址
          </label>
          <input
            type="text"
            required
            value={formData.host}
            onChange={(e) => {
              let host = e.target.value.trim();
              let port = formData.port;

              if (host.includes(':')) {
                const parts = host.split(':');
                if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
                  host = parts[0].trim();
                  port = parseInt(parts[1]);
                }
              }

              setFormData(prev => ({ ...prev, host, port }));
            }}
            className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('host') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="192.168.1.100"
          />
          {getFormFieldErrors('host') && (
            <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('host')}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            端口
          </label>
          <input
            type="number"
            required
            value={formData.port}
            onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) }))}
            className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('port') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="22"
          />
          {getFormFieldErrors('port') && (
            <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('port')}</p>
          )}
        </div>

        <div>
          <label className="block text-gray-300 text-sm font-medium mb-2">
            用户名
          </label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
            className={`w-full px-4 py-2 bg-gray-800 border ${getFormFieldErrors('username') ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            placeholder="username"
          />
          {getFormFieldErrors('username') && (
            <p className="text-red-400 text-sm mt-1">{getFormFieldErrors('username')}</p>
          )}
        </div>

        {/* 认证方式、密码、私钥等字段省略，按同样的方式添加错误显示 */}
```

**Step 5: 优化错误显示**

```typescript
        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-300 whitespace-pre-line">
            {error}
          </div>
        )}
```

**Step 6: 测试前端服务启动**

```bash
cd frontend
pnpm dev

# 访问 http://localhost:5173 并测试连接创建页面
```

**Step 7: Commit**

```bash
git add frontend/src/components/ConnectionForm.tsx
git commit -m "feat: ConnectionForm 集成 Zod 验证"
```

## Task 5: 完整验证场景测试

**Step 1: 测试所有验证场景**

使用浏览器访问应用，逐一测试以下场景：

1. **必填字段**
   - 空名称、主机、用户名应提示错误

2. **端口验证**
   - 输入 0 → "端口必须大于0"
   - 输入 65536 → "端口必须小于65536"
   - 输入 22 → 通过

3. **主机格式**
   - 输入 "invalid@host" → "主机地址格式无效"
   - 输入 "192.168.1.100" → 通过
   - 输入 "example.com" → 通过

4. **认证一致性**
   - 选择密码认证但留空 → "密码认证需要提供密码"
   - 选择私钥认证但留空 → "私钥认证需要提供私钥"

**Step 2: 修复发现的问题**

**Step 3: 最终测试确保所有场景通过**

**Step 4: Commit**

```bash
# 可能不需要提交，除非在测试过程中修复了代码
```

---

## 验证完成指标

所有测试场景均通过，包括：
- ✅ 必填字段验证
- ✅ 端口范围验证
- ✅ 主机格式验证
- ✅ 用户名格式验证
- ✅ 认证方式一致性验证

## 下一步

**For Claude:** 使用 superpowers:executing-plans 技能逐任务实施这个计划。
