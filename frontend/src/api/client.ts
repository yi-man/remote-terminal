import {
  SSHConnection,
  CreateSSHConnection,
  UpdateSSHConnection,
} from "../types";

const API_BASE = "/api";

export class APIClient {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: any = {
      "Content-Type": "application/json",
      "x-user-id": this.userId,
    };

    const response = await fetch(API_BASE + url, {
      headers,
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: "Unknown error",
      }));

      throw new Error(error.error || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  // 获取用户的所有 SSH 连接
  async getSSHConnections(): Promise<SSHConnection[]> {
    const result = await this.request<{
      success: boolean;
      data: SSHConnection[];
    }>("/connections");

    if (!result.success) {
      throw new Error("Failed to fetch connections");
    }

    return result.data;
  }

  // 获取单个 SSH 连接
  async getSSHConnection(id: string): Promise<SSHConnection> {
    const result = await this.request<{
      success: boolean;
      data: SSHConnection;
    }>(`/connections/${id}`);

    if (!result.success) {
      throw new Error("Failed to fetch connection");
    }

    return result.data;
  }

  // 创建新的 SSH 连接
  async createSSHConnection(
    connection: CreateSSHConnection,
  ): Promise<SSHConnection> {
    const result = await this.request<{
      success: boolean;
      data: SSHConnection;
    }>("/connections", {
      method: "POST",
      body: JSON.stringify(connection),
    });

    if (!result.success) {
      throw new Error("Failed to create connection");
    }

    return result.data;
  }

  // 更新 SSH 连接
  async updateSSHConnection(
    id: string,
    updates: UpdateSSHConnection,
  ): Promise<SSHConnection> {
    const result = await this.request<{
      success: boolean;
      data: SSHConnection;
    }>(`/connections/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });

    if (!result.success) {
      throw new Error("Failed to update connection");
    }

    return result.data;
  }

  // 删除 SSH 连接
  async deleteSSHConnection(id: string): Promise<void> {
    await this.request<{ success: boolean }>(`/connections/${id}`, {
      method: "DELETE",
    });
  }
}

// 导出简化的实例创建函数
export function getAPIClient(userId: string): APIClient {
  // 为不同的用户ID缓存不同的实例，避免重复创建
  const cacheKey = userId;
  if (!(cacheKey in getAPIClient.cache)) {
    getAPIClient.cache[cacheKey] = new APIClient(userId);
  }
  return getAPIClient.cache[cacheKey];
}

// 初始化缓存
getAPIClient.cache = {} as Record<string, APIClient>;
