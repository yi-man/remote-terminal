import fastify from 'fastify';
import { healthRoutes } from '../routes/health';

describe('Health check endpoint', () => {
  let app: fastify.FastifyInstance;

  beforeAll(async () => {
    app = fastify();
    await healthRoutes(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return health check with status ok', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toEqual(200);

    const body = JSON.parse(response.payload);
    expect(body.status).toEqual('ok');
    expect(body.version).toEqual('1.0.0');
    expect(typeof body.timestamp).toEqual('number');
    expect(body.timestamp).toBeGreaterThan(0);
  });

  it('should return JSON content type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers['content-type']).toContain('application/json');
  });
});
