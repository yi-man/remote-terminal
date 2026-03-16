// 临时内存数据库实现（替代 better-sqlite3，用于开发阶段）
import crypto from 'crypto';
import { SSHConnection, CreateSSHConnection, UpdateSSHConnection } from '../types';
import { encrypt, decrypt } from './crypto';

const memoryDB: { [userId: string]: SSHConnection[] } = {};

class MemoryDatabaseService {
  // 创建 SSH 连接配置
  createSSHConnection(connection: CreateSSHConnection): SSHConnection {
    const id = crypto.randomUUID();
    const now = Date.now();

    const encryptedConnection: any = {
      ...connection,
      id,
      created_at: now,
      updated_at: now,
    };

    if (encryptedConnection.password) {
      encryptedConnection.password = encrypt(encryptedConnection.password);
    }

    if (encryptedConnection.private_key) {
      encryptedConnection.private_key = encrypt(encryptedConnection.private_key);
    }

    if (encryptedConnection.passphrase) {
      encryptedConnection.passphrase = encrypt(encryptedConnection.passphrase);
    }

    if (!memoryDB[connection.user_id]) {
      memoryDB[connection.user_id] = [];
    }

    memoryDB[connection.user_id].push(encryptedConnection);

    return this.getSSHConnection(id)!;
  }

  // 获取单个 SSH 连接配置
  getSSHConnection(id: string): SSHConnection | undefined {
    for (const userConnections of Object.values(memoryDB)) {
      const found = userConnections.find((c) => c.id === id);
      if (found) {
        return this.decryptConnection(found);
      }
    }
    return undefined;
  }

  // 获取用户的所有 SSH 连接配置
  getSSHConnectionsByUserId(user_id: string): SSHConnection[] {
    const connections = memoryDB[user_id] || [];
    return connections.map(this.decryptConnection);
  }

  // 更新 SSH 连接配置
  updateSSHConnection(id: string, updates: UpdateSSHConnection): SSHConnection | undefined {
    const existing = this.getSSHConnection(id);
    if (!existing) {
      return undefined;
    }

    const now = Date.now();
    const updatedConnection: any = {
      ...existing,
      ...updates,
      id,
      updated_at: now,
    };

    if (updatedConnection.password && updatedConnection.password !== existing.password) {
      updatedConnection.password = encrypt(updatedConnection.password);
    }

    if (updatedConnection.private_key && updatedConnection.private_key !== existing.private_key) {
      updatedConnection.private_key = encrypt(updatedConnection.private_key);
    }

    if (updatedConnection.passphrase && updatedConnection.passphrase !== existing.passphrase) {
      updatedConnection.passphrase = encrypt(updatedConnection.passphrase);
    }

    // 找到并替换旧的连接
    for (const userId in memoryDB) {
      const index = memoryDB[userId].findIndex((c) => c.id === id);
      if (index !== -1) {
        memoryDB[userId][index] = updatedConnection;
        break;
      }
    }

    return this.getSSHConnection(id)!;
  }

  // 删除 SSH 连接配置
  deleteSSHConnection(id: string): boolean {
    let deleted = false;

    for (const userId in memoryDB) {
      const initialLength = memoryDB[userId].length;
      memoryDB[userId] = memoryDB[userId].filter((c) => c.id !== id);
      if (memoryDB[userId].length < initialLength) {
        deleted = true;
        break;
      }
    }

    return deleted;
  }

  // 记录连接使用时间
  updateLastUsedAt(id: string): void {
    const now = Date.now();

    for (const userId in memoryDB) {
      const connection = memoryDB[userId].find((c) => c.id === id);
      if (connection) {
        connection.last_used_at = now;
        connection.updated_at = now;
        break;
      }
    }
  }

  // 解密连接配置
  private decryptConnection(row: any): SSHConnection {
    const decrypted: any = { ...row };

    if (decrypted.password) {
      decrypted.password = decrypt(decrypted.password);
    }

    if (decrypted.private_key) {
      decrypted.private_key = decrypt(decrypted.private_key);
    }

    if (decrypted.passphrase) {
      decrypted.passphrase = decrypt(decrypted.passphrase);
    }

    return decrypted as SSHConnection;
  }
}

export const db = new MemoryDatabaseService();
