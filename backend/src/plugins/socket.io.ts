import { FastifyInstance } from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import { db } from '../services/database';
import { SSHClient } from '../services/ssh';
import { sessionManager } from '../services/session-manager';

interface ConnectSSHData {
  userId: string;
  connectionId: string;
  rows?: number;
  cols?: number;
}

interface ResizeData {
  rows: number;
  cols: number;
}

export async function socketIoPlugin(app: FastifyInstance) {
  await app.register(fastifySocketIO, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  (app as any).io.on('connection', (socket: any) => {
    console.log('Socket connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });

    socket.on('connect-ssh', async ({ userId, connectionId, rows, cols }: ConnectSSHData) => {
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

          // Register data handler for new socket
          sshClient.onData((data) => {
            socket.emit('data', data);
          });

          // Register error handler for new socket
          sshClient.onError((error) => {
            socket.emit('error', { message: error.message });
          });

          setupSocketListeners(socket, sshClient);
          sshClient.resize(rows || 24, cols || 80);

          // 发送 connected 事件通知前端会话已复用
          socket.emit('connected', { reused: true });

          // 发送一个换行到新终端，避免内容堆叠在命令提示符前
          // 同时避免发送完整的缓冲历史，防止乱码和 tmux attach 问题
          socket.emit('data', '\r\n');

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

  socket.on('resize', ({ rows, cols }: ResizeData) => {
    sshClient.resize(rows, cols);
  });

  socket.on('disconnect', () => {
    const sessionId = socket.data.sessionId;
    console.log(`Socket disconnected, session: ${sessionId}`);
    // 这里不立即清除会话，允许刷新页面复用会话
    // 如果需要在 socket 断开后立即清除会话，可以取消下面的注释
    // if (sessionId) {
    //   sessionManager.removeSession(sessionId);
    // }
  });

  socket.on('kill-session', () => {
    const sessionId = socket.data.sessionId;
    if (sessionId) {
      console.log(`Killing session ${sessionId}`);
      sessionManager.removeSession(sessionId);
    }
  });
}
