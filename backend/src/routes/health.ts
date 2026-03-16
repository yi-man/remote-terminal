import { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (req, res) => {
    res.send({
      status: 'ok',
      timestamp: Date.now(),
      version: '1.0.0',
    });
  });
}
