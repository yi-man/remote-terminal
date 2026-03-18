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
const updateConnectionSchema = baseConnectionSchema.omit({ user_id: true }).partial()
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

export async function connectionRoutes(app: FastifyInstance) {
  // 获取用户的所有连接
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

  // 获取单个连接
  app.get('/api/connections/:id', async (req, res) => {
    const { id } = req.params as { id: string };
    const user_id = req.headers['x-user-id'] as string;

    if (!user_id) {
      return res.status(400).send({ error: 'x-user-id header is required' });
    }

    const connection = db.getSSHConnection(id);

    if (!connection || connection.user_id !== user_id) {
      return res.status(404).send({ error: 'Connection not found' });
    }

    return {
      success: true,
      data: connection,
    };
  });

  // 创建连接
  app.post('/api/connections', async (req, res) => {
    const body = req.body as unknown;

    try {
      let validated = createConnectionSchema.parse(body);

      // 防御性修复：如果 host 包含端口号，分离出来
      if (validated.host && validated.host.includes(':')) {
        const parts = validated.host.split(':');
        validated.host = parts[0];
        if (parts[1] && !isNaN(parseInt(parts[1]))) {
          validated.port = parseInt(parts[1]);
        }
        console.log(`Fixed host format during creation: ${(body as any).host} -> ${validated.host}:${validated.port}`);
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

  // 更新连接
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

      // 防御性修复：如果 host 包含端口号，分离出来
      if (validated.host && validated.host.includes(':')) {
        const parts = validated.host.split(':');
        validated.host = parts[0];
        if (parts[1] && !isNaN(parseInt(parts[1]))) {
          validated.port = parseInt(parts[1]);
        }
        console.log(`Fixed host format during update: ${(body as any).host} -> ${validated.host}:${validated.port}`);
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

  // 删除连接
  app.delete('/api/connections/:id', async (req, res) => {
    const { id } = req.params as { id: string };
    const user_id = req.headers['x-user-id'] as string;

    if (!user_id) {
      return res.status(400).send({ error: 'x-user-id header is required' });
    }

    const existing = db.getSSHConnection(id);

    if (!existing || existing.user_id !== user_id) {
      return res.status(404).send({ error: 'Connection not found' });
    }

    db.deleteSSHConnection(id);

    return {
      success: true,
    };
  });
}
