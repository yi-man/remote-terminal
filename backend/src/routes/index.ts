import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { connectionRoutes } from './connections';

export async function registerRoutes(app: FastifyInstance) {
  await healthRoutes(app);
  await connectionRoutes(app);
}
