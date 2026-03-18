import { test, expect } from '@playwright/test';
import { TEST_CONNECTION } from '../fixtures/test-data';

const API_BASE = 'http://localhost:8080/api';

test.describe('Connections API', () => {
  test('GET /api/connections returns 400 if x-user-id header missing', async ({ request }) => {
    const res = await request.get(`${API_BASE}/connections`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: 'x-user-id header is required' });
  });

  test('POST /api/connections returns 400 for invalid payload', async ({ request }) => {
    const userId = `pw-it-connections-invalid-${Date.now()}`;

    const res = await request.post(`${API_BASE}/connections`, {
      headers: { 'x-user-id': userId },
      data: {
        user_id: userId,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error', 'Validation error');
    expect(body).toHaveProperty('details');
    expect(Array.isArray(body.details)).toBe(true);
    expect(body.details.length).toBeGreaterThan(0);
  });

  test('POST /api/connections normalizes host:port input', async ({ request }) => {
    const userId = `pw-it-connections-hostport-${Date.now()}`;

    const res = await request.post(`${API_BASE}/connections`, {
      headers: { 'x-user-id': userId },
      data: {
        ...TEST_CONNECTION,
        user_id: userId,
        host: '1.2.3.4:2222',
        port: 22,
        name: `pw-hostport-${Date.now()}`,
      },
    });

    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.host).toBe('1.2.3.4');
    expect(body.data.port).toBe(2222);
  });

  test('connections are isolated between users', async ({ request }) => {
    const userA = `pw-it-connections-userA-${Date.now()}`;
    const userB = `pw-it-connections-userB-${Date.now()}`;

    const createRes = await request.post(`${API_BASE}/connections`, {
      headers: { 'x-user-id': userA },
      data: {
        ...TEST_CONNECTION,
        user_id: userA,
        name: `pw-cross-user-${Date.now()}`,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    const connectionId = created.data.id as string;

    const listBRes = await request.get(`${API_BASE}/connections`, {
      headers: { 'x-user-id': userB },
    });
    expect(listBRes.ok()).toBeTruthy();
    const listB = await listBRes.json();
    expect(listB.success).toBe(true);
    expect(listB.data).toEqual([]);

    const getBRes = await request.get(`${API_BASE}/connections/${connectionId}`, {
      headers: { 'x-user-id': userB },
    });
    expect(getBRes.status()).toBe(404);
    const getBody = await getBRes.json();
    expect(getBody).toEqual({ error: 'Connection not found' });
  });
});

