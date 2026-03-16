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

  // 获取单个 SSH 连接配置（从内存 DB 中获取加密版本，不解密）
  private getEncryptedSSHConnection(id: string): any | undefined {
    for (const userConnections of Object.values(memoryDB)) {
      const found = userConnections.find((c) => c.id === id);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  // 获取单个 SSH 连接配置（解密）
  getSSHConnection(id: string): SSHConnection | undefined {
    const found = this.getEncryptedSSHConnection(id);
    if (found) {
      return this.decryptConnection(found);
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
    const encryptedExisting = this.getEncryptedSSHConnection(id);
    if (!encryptedExisting) {
      return undefined;
    }

    // 获取解密后的现有连接
    const existing = this.decryptConnection(encryptedExisting);

    const now = Date.now();
    const updatedConnection: any = {
      ...existing,
      ...updates,
      id,
      updated_at: now,
    };

    // 重新加密敏感字段
    const encryptedToStore: any = {
      ...updatedConnection,
    };

    // 只加密更改过的字段
    if (updates.password !== undefined) {
      if (updates.password) {
        encryptedToStore.password = encrypt(updates.password);
      } else {
        delete encryptedToStore.password;
      }
    } else if (encryptedExisting.password) {
      encryptedToStore.password = encryptedExisting.password;
    }

    if (updates.private_key !== undefined) {
      if (updates.private_key) {
        encryptedToStore.private_key = encrypt(updates.private_key);
      } else {
        delete encryptedToStore.private_key;
      }
    } else if (encryptedExisting.private_key) {
      encryptedToStore.private_key = encryptedExisting.private_key;
    }

    if (updates.passphrase !== undefined) {
      if (updates.passphrase) {
        encryptedToStore.passphrase = encrypt(updates.passphrase);
      } else {
        delete encryptedToStore.passphrase;
      }
    } else if (encryptedExisting.passphrase) {
      encryptedToStore.passphrase = encryptedExisting.passphrase;
    }

    // 找到并替换旧的连接
    for (const userId in memoryDB) {
      const index = memoryDB[userId].findIndex((c) => c.id === id);
      if (index !== -1) {
        memoryDB[userId][index] = encryptedToStore;
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
        (connection as any).last_used_at = now;
        (connection as any).updated_at = now;
        break;
      }
    }
  }

  // 解密连接配置
  private decryptConnection(row: any): SSHConnection {
    const decrypted: any = { ...row };

    if (decrypted.password) {
      try {
        decrypted.password = decrypt(decrypted.password);
      } catch (e) {
        // 可能已经是解密后的（旧数据），保持原样
      }
    }

    if (decrypted.private_key) {
      try {
        decrypted.private_key = decrypt(decrypted.private_key);
      } catch (e) {
        // 可能已经是解密后的（旧数据），保持原样
      }
    }

    if (decrypted.passphrase) {
      try {
        decrypted.passphrase = decrypt(decrypted.passphrase);
      } catch (e) {
        // 可能已经是解密后的（旧数据），保持原样
      }
    }

    return decrypted as SSHConnection;
  }
}

export const db = new MemoryDatabaseService();
