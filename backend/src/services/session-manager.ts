import { SSHClient } from './ssh';
import crypto from 'crypto';

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 分钟

interface SSHSession {
  id: string;
  userId: string;
  connectionId: string;
  sshClient: SSHClient;
  createdAt: number;
  lastActiveAt: number;
  timeout: NodeJS.Timeout;
}

class SessionManager {
  private sessions: Map<string, SSHSession> = new Map();

  // For testing purposes only
  _clearAll(): void {
    for (const session of this.sessions.values()) {
      clearTimeout(session.timeout);
    }
    this.sessions.clear();
  }

  createSession(userId: string, connectionId: string, sshClient: SSHClient): string {
    const sessionId = crypto.randomUUID();
    const session: SSHSession = {
      id: sessionId,
      userId,
      connectionId,
      sshClient,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      timeout: this.createTimeout(sessionId),
    };
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  getSession(sessionId: string): SSHSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByConnection(userId: string, connectionId: string): SSHSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.connectionId === connectionId) {
        return session;
      }
    }
    return undefined;
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActiveAt = Date.now();
      this.resetTimeout(sessionId);
    }
  }

  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      clearTimeout(session.timeout);
      this.sessions.delete(sessionId);
      session.sshClient.destroy().catch(() => {});
    }
  }

  private createTimeout(sessionId: string): NodeJS.Timeout {
    return setTimeout(() => {
      console.log(`Session ${sessionId} timed out, cleaning up`);
      this.removeSession(sessionId);
    }, SESSION_TIMEOUT);
  }

  private resetTimeout(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      clearTimeout(session.timeout);
      session.timeout = this.createTimeout(sessionId);
    }
  }
}

export const sessionManager = new SessionManager();
