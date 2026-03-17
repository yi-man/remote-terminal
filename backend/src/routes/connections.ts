import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../services/database';
import type { CreateSSHConnection, UpdateSSHConnection } from '../types';

const createConnectionSchema = z.object({
  user_id: z.string().min(1),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().default(22),
  username: z.string().min(1),
  auth_type: z.enum(['password', 'privateKey']),
  password: z.string().optional(),
  private_key: z.string().optional(),
  passphrase: z.string().optional(),
  terminal_type: z.string().default('xterm-256color'),
  font_size: z.number().int().default(14),
  theme: z.string().default('dark'),
});

const updateConnectionSchema = createConnectionSchema.omit({ user_id: true }).partial();

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
      const validated = createConnectionSchema.parse(body);
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
      const validated = updateConnectionSchema.parse(body);
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
