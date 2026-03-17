import { TEST_USER_ID } from '../fixtures/test-data';

const API_BASE = 'http://localhost:8080/api';

export class APIHelper {
  private userId: string;

  constructor(userId: string = TEST_USER_ID) {
    this.userId = userId;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: any = {
      'Content-Type': 'application/json',
      'x-user-id': this.userId,
    };

    const response = await fetch(API_BASE + url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Unknown error',
      }));
      throw new Error(error.error || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  async getConnections() {
    return this.request('/connections');
  }

  async createConnection(connection: any) {
    return this.request('/connections', {
      method: 'POST',
      body: JSON.stringify(connection),
    });
  }

  async deleteConnection(id: string) {
    return this.request(`/connections/${id}`, {
      method: 'DELETE',
    });
  }

  async cleanupAllConnections() {
    try {
      const result = await this.getConnections() as any;
      if (result.success && result.data) {
        for (const conn of result.data) {
          await this.deleteConnection(conn.id);
        }
      }
    } catch (e) {
      console.log('Cleanup error (might be empty):', e);
    }
  }
}

export const apiHelper = new APIHelper();
