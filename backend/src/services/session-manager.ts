import { SSHClient } from './ssh';
import crypto from 'crypto';

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 分钟

interface SSHSession {
  id: string;
  userId: string;
  connectionId: string;
  epoch: number;
  sshClient: SSHClient;
  createdAt: number;
  lastActiveAt: number;
  timeout: NodeJS.Timeout;
}

class SessionManager {
  private sessions: Map<string, SSHSession> = new Map();
  private epochs: Map<string, number> = new Map();

  private epochKey(userId: string, connectionId: string): string {
    return `${userId}:${connectionId}`;
  }

  // For testing purposes only
  _clearAll(): void {
    for (const session of this.sessions.values()) {
      clearTimeout(session.timeout);
    }
    this.sessions.clear();
    this.epochs.clear();
  }

  getEpoch(userId: string, connectionId: string): number {
    return this.epochs.get(this.epochKey(userId, connectionId)) ?? 0;
  }

  setEpoch(userId: string, connectionId: string, epoch: number): void {
    this.epochs.set(this.epochKey(userId, connectionId), epoch);
  }

  bumpEpoch(userId: string, connectionId: string): number {
    const next = this.getEpoch(userId, connectionId) + 1;
    this.setEpoch(userId, connectionId, next);
    return next;
  }

  createSession(userId: string, connectionId: string, epoch: number, sshClient: SSHClient): string {
    // Ensure there is at most one live session per (userId, connectionId).
    this.removeSessionByConnection(userId, connectionId);

    const sessionId = crypto.randomUUID();
    const session: SSHSession = {
      id: sessionId,
      userId,
      connectionId,
      epoch,
      sshClient,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      timeout: this.createTimeout(sessionId),
    };
    this.sessions.set(sessionId, session);
    // Persist epoch so subsequent connects have a stable baseline.
    this.setEpoch(userId, connectionId, epoch);
    return sessionId;
  }

  getSession(sessionId: string): SSHSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByConnection(userId: string, connectionId: string, epoch?: number): SSHSession | undefined {
    for (const session of this.sessions.values()) {
      const match = session.userId === userId && session.connectionId === connectionId;
      if (!match) continue;
      if (epoch !== undefined && session.epoch !== epoch) continue;
        return session;
    }
    return undefined;
  }

  removeSessionByConnection(userId: string, connectionId: string): void {
    const idsToRemove: string[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId && session.connectionId === connectionId) {
        idsToRemove.push(session.id);
      }
    }
    for (const id of idsToRemove) {
      this.removeSession(id);
    }
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
