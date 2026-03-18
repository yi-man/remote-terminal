import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sessionManager } from '../services/session-manager';

// Mock SSHClient
class MockSSHClient {
  private destroyed = false;
  async destroy() {
    this.destroyed = true;
  }
  isConnected() {
    return !this.destroyed;
  }
}

describe('SessionManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionManager._clearAll();
  });

  afterEach(() => {
    sessionManager._clearAll();
    vi.useRealTimers();
  });

  describe('createSession', () => {
    it('should create a new session and return session ID', () => {
      const sshClient = new MockSSHClient();
      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
    });

    it('should store the session with correct properties', () => {
      const sshClient = new MockSSHClient();
      const now = Date.now();
      vi.setSystemTime(now);

      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);
      const session = sessionManager.getSession(sessionId);

      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
      expect(session?.userId).toBe('user1');
      expect(session?.connectionId).toBe('conn1');
      expect(session?.epoch).toBe(0);
      expect(session?.sshClient).toBe(sshClient);
      expect(session?.createdAt).toBe(now);
      expect(session?.lastActiveAt).toBe(now);
    });
  });

  describe('getSession', () => {
    it('should return undefined for non-existent session', () => {
      const session = sessionManager.getSession('non-existent');
      expect(session).toBeUndefined();
    });

    it('should return the session for existing session ID', () => {
      const sshClient = new MockSSHClient();
      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      const session = sessionManager.getSession(sessionId);
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });
  });

  describe('getSessionByConnection', () => {
    it('should return undefined for non-existent user/connection', () => {
      const session = sessionManager.getSessionByConnection('user1', 'conn1');
      expect(session).toBeUndefined();
    });

    it('should return the session for matching user and connection', () => {
      const sshClient = new MockSSHClient();
      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      const session = sessionManager.getSessionByConnection('user1', 'conn1');
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });

    it('should return undefined for mismatched user', () => {
      const sshClient = new MockSSHClient();
      sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      const session = sessionManager.getSessionByConnection('user2', 'conn1');
      expect(session).toBeUndefined();
    });

    it('should return undefined for mismatched connection', () => {
      const sshClient = new MockSSHClient();
      sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      const session = sessionManager.getSessionByConnection('user1', 'conn2');
      expect(session).toBeUndefined();
    });
  });

  describe('updateActivity', () => {
    it('should update lastActiveAt for existing session', () => {
      const sshClient = new MockSSHClient();
      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);
      const initialActivity = sessionManager.getSession(sessionId)?.lastActiveAt;

      vi.setSystemTime(initialActivity! + 1000);
      sessionManager.updateActivity(sessionId);

      const updatedSession = sessionManager.getSession(sessionId);
      expect(updatedSession?.lastActiveAt).toBeGreaterThan(initialActivity!);
    });

    it('should do nothing for non-existent session', () => {
      expect(() => {
        sessionManager.updateActivity('non-existent');
      }).not.toThrow();
    });
  });

  describe('removeSession', () => {
    it('should remove the session', () => {
      const sshClient = new MockSSHClient();
      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      expect(sessionManager.getSession(sessionId)).toBeDefined();
      sessionManager.removeSession(sessionId);
      expect(sessionManager.getSession(sessionId)).toBeUndefined();
    });

    it('should call destroy on SSH client', async () => {
      const sshClient = new MockSSHClient();
      const destroySpy = vi.spyOn(sshClient, 'destroy');
      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      sessionManager.removeSession(sessionId);
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should do nothing for non-existent session', () => {
      expect(() => {
        sessionManager.removeSession('non-existent');
      }).not.toThrow();
    });
  });

  describe('session timeout', () => {
    it('should automatically remove session after timeout', () => {
      const sshClient = new MockSSHClient();
      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      expect(sessionManager.getSession(sessionId)).toBeDefined();

      vi.advanceTimersByTime(10 * 60 * 1000);

      expect(sessionManager.getSession(sessionId)).toBeUndefined();
    });

    it('should reset timeout when activity is updated', () => {
      const sshClient = new MockSSHClient();
      const sessionId = sessionManager.createSession('user1', 'conn1', 0, sshClient as any);

      vi.advanceTimersByTime(5 * 60 * 1000);
      sessionManager.updateActivity(sessionId);

      vi.advanceTimersByTime(11 * 60 * 1000);

      expect(sessionManager.getSession(sessionId)).toBeUndefined();
    });
  });
});
