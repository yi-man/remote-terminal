import fastify from 'fastify';
import { connectionRoutes } from '../routes/connections';
import Database from 'better-sqlite3';
import path from 'path';

// 清理测试数据库
function clearDatabase() {
  const DB_PATH = path.join('./data', 'terminal-test.db');
  const db = new Database(DB_PATH);
  db.exec('DELETE FROM ssh_connections');
  db.close();
}

describe('SSH Connections API - Independent Tests', () => {
  let app: fastify.FastifyInstance;
  const TEST_USER_ID = 'test-user-123';

  beforeAll(async () => {
    app = fastify();
    await connectionRoutes(app);
  });

  beforeEach(() => {
    clearDatabase();
  });

  afterAll(async () => {
    clearDatabase();
    await app.close();
  });

  describe('GET /api/connections', () => {
    it('should return 400 error if x-user-id header is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/connections',
      });

      expect(response.statusCode).toEqual(400);

      const body = JSON.parse(response.payload);
      expect(body.error).toEqual('x-user-id header is required');
    });

    it('should return empty list for new user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/connections',
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      });

      expect(response.statusCode).toEqual(200);

      const body = JSON.parse(response.payload);
      expect(body.success).toEqual(true);
      expect(body.data).toEqual([]);
    });
  });

  describe('POST /api/connections', () => {
    it('should create a new SSH connection', async () => {
      const newConnection = {
        user_id: TEST_USER_ID,
        name: 'Test Connection',
        host: 'localhost',
        port: 22,
        username: 'testuser',
        auth_type: 'password',
        password: 'testpassword',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/connections',
        headers: {
          'x-user-id': TEST_USER_ID,
          'Content-Type': 'application/json',
        },
        payload: newConnection,
      });

      expect(response.statusCode).toEqual(200);

      const body = JSON.parse(response.payload);
      expect(body.success).toEqual(true);
      expect(body.data).toHaveProperty('id');
      expect(body.data.name).toEqual(newConnection.name);
      expect(body.data.host).toEqual(newConnection.host);
      expect(body.data.port).toEqual(newConnection.port);
      expect(body.data.username).toEqual(newConnection.username);
      expect(body.data.auth_type).toEqual(newConnection.auth_type);
    });

    it('should validate required fields when creating connection', async () => {
      const invalidConnection = {
        user_id: TEST_USER_ID,
        // Missing name, host, username, auth_type
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/connections',
        headers: {
          'x-user-id': TEST_USER_ID,
          'Content-Type': 'application/json',
        },
        payload: invalidConnection,
      });

      expect(response.statusCode).toEqual(400);

      const body = JSON.parse(response.payload);
      expect(body.error).toEqual('Validation error');
      expect(body.details).toBeInstanceOf(Array);
      expect(body.details.length).toBeGreaterThan(0);
    });
  });
});

describe('SSH Connections API - Workflow Tests', () => {
  let app: fastify.FastifyInstance;
  const TEST_USER_ID = 'workflow-test-user-123';

  beforeAll(async () => {
    app = fastify();
    await connectionRoutes(app);
    clearDatabase();
  });

  afterAll(async () => {
    clearDatabase();
    await app.close();
  });

  describe('Connection management workflow', () => {
    let testConnectionId: string;

    it('should create and retrieve connection', async () => {
      // Create a connection
      const newConnection = {
        user_id: TEST_USER_ID,
        name: 'Workflow Test Connection',
        host: '192.168.1.100',
        port: 2222,
        username: 'devuser',
        auth_type: 'privateKey',
        private_key: '-----BEGIN RSA PRIVATE KEY-----\ntestkey\n-----END RSA PRIVATE KEY-----',
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/connections',
        headers: {
          'x-user-id': TEST_USER_ID,
          'Content-Type': 'application/json',
        },
        payload: newConnection,
      });

      expect(createResponse.statusCode).toEqual(200);

      const createBody = JSON.parse(createResponse.payload);
      expect(createBody.success).toEqual(true);
      testConnectionId = createBody.data.id;

      // Get the connection
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/connections/${testConnectionId}`,
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      });

      expect(getResponse.statusCode).toEqual(200);

      const getBody = JSON.parse(getResponse.payload);
      expect(getBody.success).toEqual(true);
      expect(getBody.data.id).toEqual(testConnectionId);
      expect(getBody.data.name).toEqual(newConnection.name);
    });

    it('should update existing connection', async () => {
      const updatedData = {
        name: 'Updated Connection Name',
        port: 2223,
        terminal_type: 'xterm-color',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/connections/${testConnectionId}`,
        headers: {
          'x-user-id': TEST_USER_ID,
          'Content-Type': 'application/json',
        },
        payload: updatedData,
      });

      expect(response.statusCode).toEqual(200);

      const body = JSON.parse(response.payload);
      expect(body.success).toEqual(true);
      expect(body.data.id).toEqual(testConnectionId);
      expect(body.data.name).toEqual(updatedData.name);
      expect(body.data.port).toEqual(updatedData.port);
      expect(body.data.terminal_type).toEqual(updatedData.terminal_type);
    });

    it('should delete connection', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/connections/${testConnectionId}`,
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      });

      expect(response.statusCode).toEqual(200);

      const body = JSON.parse(response.payload);
      expect(body.success).toEqual(true);
    });

    it('should not find deleted connection', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/connections/${testConnectionId}`,
        headers: {
          'x-user-id': TEST_USER_ID,
        },
      });

      expect(response.statusCode).toEqual(404);
    });
  });
});
