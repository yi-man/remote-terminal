# SSH 连接创建/修改类型校验设计

**日期**: 2026-03-18
**作者**: Claude Code
**状态**: 待实施

## 概述

为 SSH 连接创建和修改功能添加完整的前后端类型校验，确保数据完整性和安全性。

## 当前问题

### 后端验证不足
- 只有基础 Zod 类型校验
- 缺少端口范围验证 (1-65535)
- 缺少主机格式验证 (域名/IP)
- 缺少用户名格式验证
- 缺少认证方式与字段一致性验证

### 前端验证缺失
- 只有 HTML `required` 属性
- 无实时校验反馈
- 无与后端一致的校验逻辑
- 缺少错误信息展示

## 设计方案

### 技术选择
- **前后端校验库**: Zod (后端已有，前端引入)
- **校验层面**: 前后端双重校验
- **一致性保证**: 使用相同的验证规则

### 后端验证增强

在 `backend/src/routes/connections.ts` 中增强 Zod schema：

#### 新增验证规则
1. **端口范围**: 1-65535
2. **主机格式**: 域名 (字母、数字、点、连字符) 或 IPv4 地址
3. **用户名格式**: 字母、数字、下划线、连字符
4. **连接名称**: 最长 100 字符
5. **认证一致性**:
   - auth_type = 'password' 时，password 字段必填
   - auth_type = 'privateKey' 时，private_key 字段必填

#### Zod Schema 定义
```typescript
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
    if (data.auth_type === 'password') {
      return data.password === undefined || (!!data.password && data.password.trim().length > 0);
    }
    if (data.auth_type === 'privateKey') {
      return data.private_key === undefined || (!!data.private_key && data.private_key.trim().length > 0);
    }
    return true;
  }, {
    message: '密码认证需要提供密码，私钥认证需要提供私钥',
    path: ['auth_type']
  });
```

### 前端验证实现

#### 安装依赖
```bash
cd frontend
pnpm add zod
```

#### 创建验证 Hook
```typescript
// frontend/src/hooks/useSSHConnectionValidation.ts
import { z } from 'zod';

// 与后端完全一致的验证 schema
export const createConnectionSchema = /* ... */;
export const updateConnectionSchema = /* ... */;

export const validateSSHConnection = {
  create: (data: any) => createConnectionSchema.safeParse(data),
  update: (data: any) => updateConnectionSchema.safeParse(data),
};
```

#### ConnectionForm.tsx 增强
- 表单提交时进行验证
- 实时字段验证反馈
- 错误信息显示

### 文件变更清单

#### 后端
- `backend/src/routes/connections.ts` - 增强 Zod schema

#### 前端
- `frontend/package.json` - 添加 zod 依赖
- `frontend/src/hooks/useSSHConnectionValidation.ts` - 新建验证 hook
- `frontend/src/components/ConnectionForm.tsx` - 集成验证逻辑
- `frontend/src/types/index.ts` - 添加验证错误类型（可选）

### 验证场景测试清单

1. **必填字段验证**
   - 空名称、主机、用户名应提示错误

2. **端口验证**
   - 端口 0 → 错误
   - 端口 65536 → 错误
   - 端口 1-65535 → 通过

3. **主机格式验证**
   - 包含特殊字符 → 错误
   - 有效域名 → 通过
   - 有效 IPv4 → 通过

4. **用户名格式验证**
   - 包含特殊字符 → 错误
   - 有效用户名 → 通过

5. **认证方式一致性验证**
   - password 认证但无密码 → 错误
   - privateKey 认证但无私钥 → 错误

## 技术优势

1. **一致性**: 前后端使用完全一致的验证逻辑
2. **用户体验**: 前端实时验证，错误信息清晰
3. **安全性**: 后端严格验证，防止无效数据
4. **维护性**: 验证逻辑集中管理，易于修改
5. **可扩展性**: 使用 Zod 提供了类型安全和自动提示

## 风险评估

**低风险**
- 后端已有 Zod 基础，只需增强
- 前端引入 Zod 不会影响现有功能
- 验证逻辑可以渐进式添加

## 下一步

创建详细的实施计划，开始编码实现。
