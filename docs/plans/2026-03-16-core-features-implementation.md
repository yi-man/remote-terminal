# 核心功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**目标:** 实现 Socket.IO WebSocket、真实 SSH 连接、会话保持等核心功能，让终端真正可用

**架构:** 前后端分离架构，使用 Socket.IO 进行实时通信，ssh2 进行 SSH 连接，会话管理器处理连接保持和恢复

**技术栈:** Node.js 22 + TypeScript + Fastify + Socket.IO + ssh2 + React 18 + xterm.js

---

## 准备工作

首先确认依赖已安装（已确认）：
- 后端: fastify-socket.io, ssh2, socket.io ✓
- 前端: socket.io-client ✓

---

### Task 1: 后端会话管理器 (Session Manager)

**文件:**
- Create: `backend/src/services/session-manager.ts`
- Test: `backend/src/__tests__/session-manager.test.ts`

**Step 1: 定义类型定义**

```typescript
// backend/src/types/index.ts (需要添加)
export interface SSHSession {
  id: string;
  userId: string;
  connectionId: string;
  sshClient: any; // SSHClient 实例
  createdAt: number;
  lastActiveAt: number;
  timeout: NodeJS.Timeout;
}
```

**Step 2: 实现会话管理器**

```typescript
// backend/src/services/session-manager.ts
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
      console.log(`Session ${sessionId} timed out, cleaning up');
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
```

**Step 3: Commit**

```bash
git add backend/src/services/session-manager.ts
git commit -m "feat: add session manager for SSH sessions"
```

---

### Task 2: 后端真实 SSH 服务 (SSH Service)

**文件:**
- Modify: `backend/src/services/ssh.ts`
- Test: `backend/src/__tests__/ssh.test.ts`

**Step 1: 实现真实的 SSH 服务**

```typescript
// backend/src/services/ssh.ts
import { Client, Channel } from 'ssh2';
import type { ConnectConfig } from 'ssh2';

export interface SSHConnectOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
}

export interface SSHDataHandler {
  (data: string): void;
}

export interface SSHErrorHandler {
  (error: Error): void;
}

export class SSHClient {
  private client: Client | null = null;
  private shellChannel: Channel | null = null;
  private onDataHandler: SSHDataHandler | null = null;
  private onErrorHandler: SSHErrorHandler | null = null;
  private connected: boolean = false;

  async connect(options: SSHConnectOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client = new Client();

      const config: ConnectConfig = {
        host: options.host,
        port: options.port,
        username: options.username,
      };

      if (options.password) {
        config.password = options.password;
      } else if (options.privateKey) {
        config.privateKey = options.privateKey;
        if (options.passphrase) {
          config.passphrase = options.passphrase;
        }
      }

      this.client.on('ready', () => {
        console.log('SSH connection established');
        this.client!.shell({
          term: 'xterm-256color',
        }, (err, channel) => {
          if (err) {
          reject(err);
          return;
        }

        this.shellChannel = channel;
        this.connected = true;

        channel.on('data', (data: Buffer) => {
          if (this.onDataHandler) {
            this.onDataHandler(data.toString());
          }
        });

        channel.on('close', () => {
          console.log('Shell channel closed');
          this.connected = false;
        });

        channel.stderr.on('data', (data: Buffer) => {
          console.error('SSH stderr:', data.toString());
        });

        resolve();
      });

      this.client!.on('error', (err) => {
        console.error('SSH connection error:', err);
        if (this.onErrorHandler) {
          this.onErrorHandler(err);
        }
        reject(err);
      });

      this.client!.connect(config);
    });
  }

  write(data: string): void {
    if (this.shellChannel) {
      this.shellChannel.write(data);
    }
  }

  resize(rows: number, cols: number): void {
    if (this.shellChannel) {
      this.shellChannel.setWindow(rows, cols, 0, 0);
    }
  }

  onData(handler: SSHDataHandler): void {
    this.onDataHandler = handler;
  }

  onError(handler: SSHErrorHandler): void {
    this.onErrorHandler = handler;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async destroy(): Promise<void> {
    return new Promise((resolve) => {
      if (this.shellChannel) {
        this.shellChannel.end();
        this.shellChannel = null;
      }
      if (this.client) {
        this.client.end();
        this.client = null;
      }
      this.connected = false;
      resolve();
    });
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/services/ssh.ts
git commit -m "feat: implement real SSH service with ssh2"
```

---

### Task 3: 后端 Socket.IO 插件

**文件:**
- Modify: `backend/src/plugins/socket.io.ts`

**Step 1: 实现 Socket.IO 插件**

```typescript
// backend/src/plugins/socket.io.ts
import { FastifyInstance } from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import { db } from '../services/database-memory';
import { SSHClient } from '../services/ssh';
import { sessionManager } from '../services/session-manager';
import { decrypt } from '../services/crypto';

export async function socketIoPlugin(app: FastifyInstance) {
  await app.register(fastifySocketIO, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  app.io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });

    socket.on('connect-ssh', async ({ userId, connectionId, rows, cols }) => {
      try {
        console.log(`Connecting SSH for user ${userId}, connection ${connectionId}`);

        const connection = db.getSSHConnection(connectionId);
        if (!connection) {
          socket.emit('error', { message: 'Connection not found' });
          return;
        }

        if (connection.user_id !== userId) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        let existingSession = sessionManager.getSessionByConnection(userId, connectionId);
        if (existingSession) {
          console.log('Reusing existing session');
          const sshClient = existingSession.sshClient;

          socket.data.sessionId = existingSession.id;
          sessionManager.updateActivity(existingSession.id);

          setupSocketListeners(socket, sshClient);
          sshClient.resize(rows || 24, cols || 80);

          socket.emit('connected');
          return;
        }

        const sshClient = new SSHClient();

        const connectOptions: any = {
          host: connection.host,
          port: connection.port || 22,
          username: connection.username,
        };

        if (connection.auth_type === 'password' && connection.password) {
          connectOptions.password = connection.password;
        } else if (connection.auth_type === 'privateKey' && connection.private_key) {
          connectOptions.privateKey = connection.private_key;
          if (connection.passphrase) {
            connectOptions.passphrase = connection.passphrase;
          }
        }

        sshClient.onData((data) => {
          socket.emit('data', data);
        });

        sshClient.onError((error) => {
          socket.emit('error', { message: error.message });
        });

        await sshClient.connect(connectOptions);

        const sessionId = sessionManager.createSession(userId, connectionId, sshClient);
        socket.data.sessionId = sessionId;

        if (rows && cols) {
          sshClient.resize(rows, cols);
        }

        setupSocketListeners(socket, sshClient);

        db.updateLastUsedAt(connectionId);

        socket.emit('connected');
        console.log('SSH connected successfully');

      } catch (error: any) {
        console.error('SSH connection failed:', error);
        socket.emit('error', { message: error.message || 'Connection failed' });
      }
    });
  });
}

function setupSocketListeners(socket: any, sshClient: SSHClient) {
  socket.on('data', (data: string) => {
    const sessionId = socket.data.sessionId;
    if (sessionId) {
      sessionManager.updateActivity(sessionId);
    }
    sshClient.write(data);
  });

  socket.on('resize', ({ rows, cols }) => {
    sshClient.resize(rows, cols);
  });

  socket.on('disconnect', () => {
    const sessionId = socket.data.sessionId;
  });
}
```

**Step 2: Commit**

```bash
git add backend/src/plugins/socket.io.ts
git commit -m "feat: implement Socket.IO plugin with SSH proxy"
```

---

### Task 4: 后端服务器集成

**文件:**
- Modify: `backend/src/server.ts`

**Step 1: 读取当前 server.ts**

**Step 2: 注册 Socket.IO 插件**

```typescript
import fastify from 'fastify';
import { socketIoPlugin } from './plugins/socket.io';
// ... 其他导入保持不变

// 在 register staticPlugin 之后添加
await server.register(socketIoPlugin);
```

**Step 3: Commit**

```bash
git add backend/src/server.ts
git commit -m "feat: register Socket.IO plugin"
```

---

### Task 5: 前端 WebSocket Hook

**文件:**
- Create: `frontend/src/hooks/useWebSocket.ts`

**Step 1: 实现 WebSocket Hook**

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  userId: string;
  connectionId: string;
  onConnected?: () => void;
  onData?: (data: string) => void;
  onError?: (error: string) => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { userId, connectionId, onConnected, onData, onError, onDisconnect } = options;
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback((rows: number = 24, cols: number = 80) => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnecting(true);

    const socket = io({
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('connect-ssh', { userId, connectionId, rows, cols });
    });

    socket.on('connected', () => {
      console.log('SSH connected');
      setConnected(true);
      setConnecting(false);
      onConnected?.();
    });

    socket.on('data', (data: string) => {
      onData?.(data);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      setConnecting(false);
      onError?.(error.message);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      onDisconnect?.();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, connectionId, onConnected, onData, onError, onDisconnect]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  const sendData = useCallback((data: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('data', data);
    }
  }, []);

  const resize = useCallback((rows: number, cols: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('resize', { rows, cols });
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    connecting,
    connect,
    disconnect,
    sendData,
    resize,
  };
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useWebSocket.ts
git commit -m "feat: add WebSocket hook for frontend"
```

---

### Task 6: 前端终端组件更新

**文件:**
- Modify: `frontend/src/components/Terminal.tsx`

**Step 1: 集成 WebSocket Hook**

```typescript
// frontend/src/components/Terminal.tsx
import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Toolbar } from './Toolbar';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUserId } from '../hooks/useUserId';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  connectionId: string;
  onDisconnect: () => void;
}

export function Terminal({ connectionId, onDisconnect }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const userId = useUserId();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { connected, connecting, connect, disconnect, sendData, resize } = useWebSocket({
    userId,
    connectionId,
    onConnected: () => {
      setErrorMessage(null);
    },
    onData: (data) => {
      xtermRef.current?.write(data);
    },
    onError: (error) => {
      setErrorMessage(error);
    },
  });

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new XTerm({
      theme: {
        background: '#1a1a2e',
        foreground: '#eee',
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.onData((data) => {
      sendData(data);
    });

    const handleResize = () => {
      fitAddon.fit();
      if (connected) {
        resize(terminal.rows, terminal.cols);
      }
    };

    window.addEventListener('resize', handleResize);

    connect(terminal.rows, terminal.cols);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, [connectionId]);

  const handleKeyPress = (key: string) => {
    const terminal = xtermRef.current;
    if (!terminal) return;

    switch (key) {
      case 'ctrl':
        break;
      case 'cmd':
        break;
      case 'esc':
        sendData('\x1b');
        break;
      case 'tab':
        sendData('\t');
        break;
      case 'up':
        sendData('\x1b[A');
        break;
      case 'down':
        sendData('\x1b[B');
        break;
      case 'left':
        sendData('\x1b[D');
        break;
      case 'right':
        sendData('\x1b[C');
        break;
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onDisconnect();
  };

  const getStatusText = () => {
    if (errorMessage) return '连接失败';
    if (connected) return '已连接';
    if (connecting) return '连接中...';
    return '未连接';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
          errorMessage ? 'bg-red-500' :
          connected ? 'bg-green-500' :
          'bg-yellow-500'
        }`} />
          <span className="text-gray-300 text-sm">
            {getStatusText()}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          断开
        </button>
      </div>
      {errorMessage && (
        <div className="px-4 py-2 bg-red-900/50 border-b border-red-700">
          <p className="text-red-300 text-sm">{errorMessage}</p>
        </div>
      )}
      <div ref={terminalRef} className="flex-1" />
      <Toolbar onKeyPress={handleKeyPress} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/Terminal.tsx
git commit -m "feat: update Terminal component with real WebSocket"
```

---

### Task 7: 测试与验证

**Step 1: 启动后端服务**

```bash
cd backend
pnpm dev
```

预期: 服务器启动在 8080 端口，没有错误

**Step 2: 启动前端服务**

```bash
cd frontend
pnpm dev
```

预期: 前端开发服务器正常启动

**Step 3: 端到端测试

1. 创建 SSH 连接配置
2. 点击连接
3. 验证终端可以输入输出正常

**Step 4: 会话保持测试

1. 连接 SSH
2. 刷新页面
3. 验证会话恢复

**Step 5: Commit (如果有修改)**

```bash
git add ...
git commit -m "test: verify end-to-end functionality"
```

---

## 执行选择

计划完成并保存到 `docs/plans/2026-03-16-core-features-implementation.md`。

**两种执行方式：**

**1. Subagent-Driven（当前会话）** - 我为每个任务分派新的子代理，任务之间进行审查，快速迭代

**2. 并行会话（单独会话）** - 打开新会话使用 executing-plans，批量执行带检查点

**您希望哪种方式？**
