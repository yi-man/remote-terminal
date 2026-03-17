import Database from 'better-sqlite3';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SSHConnection, CreateSSHConnection, UpdateSSHConnection } from '../types';
import { encrypt, decrypt } from './crypto';

// 确保 data/ 目录存在
const DATA_DIR = './data';
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 根据环境变量或 NODE_ENV 选择数据库文件
const DEFAULT_DB_FILENAMES: Record<string, string> = {
  development: 'terminal-dev.db',
  production: 'terminal.db',
  test: 'terminal-test.db'
};

const env = process.env.NODE_ENV || 'development';
const DB_FILENAME = process.env.DB_FILENAME ||
  DEFAULT_DB_FILENAMES[env] || DEFAULT_DB_FILENAMES.development;

const DB_PATH = path.join(DATA_DIR, DB_FILENAME);

class DatabaseService {
  private db: Database.Database;

  constructor() {
    this.db = new Database(DB_PATH);
    this.init();
  }

  private init(): void {
    // 创建 SSH 连接表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ssh_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER NOT NULL DEFAULT 22,
        username TEXT NOT NULL,
        auth_type TEXT NOT NULL CHECK (auth_type IN ('password', 'privateKey')),
        password TEXT,
        private_key TEXT,
        passphrase TEXT,
        terminal_type TEXT DEFAULT 'xterm-256color',
        font_size INTEGER DEFAULT 14,
        theme TEXT DEFAULT 'dark',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        last_used_at INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_ssh_connections_user_id ON ssh_connections(user_id);
    `;

    this.db.exec(createTableSQL);
  }

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

    const stmt = this.db.prepare(`
      INSERT INTO ssh_connections (
        id, user_id, name, host, port, username, auth_type, password,
        private_key, passphrase, terminal_type, font_size, theme,
        created_at, updated_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      encryptedConnection.id,
      encryptedConnection.user_id,
      encryptedConnection.name,
      encryptedConnection.host,
      encryptedConnection.port,
      encryptedConnection.username,
      encryptedConnection.auth_type,
      encryptedConnection.password,
      encryptedConnection.private_key,
      encryptedConnection.passphrase,
      encryptedConnection.terminal_type,
      encryptedConnection.font_size,
      encryptedConnection.theme,
      encryptedConnection.created_at,
      encryptedConnection.updated_at,
      encryptedConnection.last_used_at,
    ]);

    return this.getSSHConnection(id)!;
  }

  // 获取单个 SSH 连接配置
  getSSHConnection(id: string): SSHConnection | undefined {
    const stmt = this.db.prepare('SELECT * FROM ssh_connections WHERE id = ?');
    const row = stmt.get(id);

    if (!row) {
      return undefined;
    }

    return this.decryptConnection(row as any);
  }

  // 获取用户的所有 SSH 连接配置
  getSSHConnectionsByUserId(user_id: string): SSHConnection[] {
    const stmt = this.db.prepare('SELECT * FROM ssh_connections WHERE user_id = ? ORDER BY name');
    const rows = stmt.all(user_id);

    return (rows as any[]).map(this.decryptConnection);
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

    // 只加密用户明确传入的新值，避免比较逻辑问题
    if (updates.password !== undefined) {
      updatedConnection.password = encrypt(updates.password);
    }

    if (updates.private_key !== undefined) {
      updatedConnection.private_key = encrypt(updates.private_key);
    }

    if (updates.passphrase !== undefined) {
      updatedConnection.passphrase = encrypt(updates.passphrase);
    }

    const stmt = this.db.prepare(`
      UPDATE ssh_connections
      SET user_id = ?, name = ?, host = ?, port = ?, username = ?, auth_type = ?, password = ?,
          private_key = ?, passphrase = ?, terminal_type = ?, font_size = ?, theme = ?,
          updated_at = ?, last_used_at = ?
      WHERE id = ?
    `);

    stmt.run([
      updatedConnection.user_id,
      updatedConnection.name,
      updatedConnection.host,
      updatedConnection.port,
      updatedConnection.username,
      updatedConnection.auth_type,
      updatedConnection.password,
      updatedConnection.private_key,
      updatedConnection.passphrase,
      updatedConnection.terminal_type,
      updatedConnection.font_size,
      updatedConnection.theme,
      updatedConnection.updated_at,
      updatedConnection.last_used_at,
      id,
    ]);

    return this.getSSHConnection(id)!;
  }

  // 删除 SSH 连接配置
  deleteSSHConnection(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM ssh_connections WHERE id = ?');
    const result = stmt.run(id);

    return result.changes > 0;
  }

  // 记录连接使用时间
  updateLastUsedAt(id: string): void {
    const stmt = this.db.prepare('UPDATE ssh_connections SET last_used_at = ? WHERE id = ?');
    stmt.run(Date.now(), id);
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

export const db = new DatabaseService();
