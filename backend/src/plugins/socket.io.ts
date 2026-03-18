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

        // 防御性修复：确保 host 不包含端口号
        // 如果 host 包含冒号，分割出真正的 host
        let { host, port } = connection;
        if (host && host.includes(':')) {
          const parts = host.split(':');
          host = parts[0];
          // 如果分割后有端口并且是有效数字，使用它
          if (parts[1] && !isNaN(parseInt(parts[1]))) {
            port = parseInt(parts[1]);
          }
          console.log(`Fixed host format: ${connection.host} -> ${host}:${port}`);
        }

        let existingSession = sessionManager.getSessionByConnection(userId, connectionId);
        if (existingSession) {
          console.log('Reusing existing session');
          let sshClient = existingSession.sshClient;

          socket.data.sessionId = existingSession.id;
          sessionManager.updateActivity(existingSession.id);

          // 检查 SSH 连接是否仍然有效
          if (!sshClient.isConnected()) {
            console.log('SSH shell channel closed, recreating shell...');
            try {
              await sshClient.recreateShell();
              console.log('Shell recreated successfully');
            } catch (err) {
              console.error('Failed to recreate shell, creating new SSH connection:', err);
              // 如果 recreateShell 失败，创建一个全新的 SSH 连接
              sshClient = new SSHClient();

              const connectOptions: any = {
                host: host,
                port: port || 22,
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

              // 更新会话中的 SSHClient
              existingSession.sshClient = sshClient;
            }
          }

          // 智能发送历史记录
          const fullHistory = sshClient.getOutputBuffer();
          let historyToSend = '\r\n'; // 默认只发送换行

          if (fullHistory) {
            // 检测是否在 tmux 会话中（通过特征字符串）
            const isInTmux = fullHistory.includes('tmux') || fullHistory.includes('%0');

            if (isInTmux) {
              console.log('Detected tmux session, sending minimal history');
              // tmux 会话只发送最后 50 行，避免乱码
              const lines = fullHistory.split('\n');
              const recentLines = lines.slice(Math.max(0, lines.length - 50)).join('\n');
              historyToSend = recentLines + '\r\n';
            } else {
              console.log('Normal SSH session, sending moderate history');
              // 普通 SSH 会话发送最后 500 行
              const lines = fullHistory.split('\n');
              const recentLines = lines.slice(Math.max(0, lines.length - 500)).join('\n');
              historyToSend = recentLines + '\r\n';
            }
          }

          // Register data handler for new socket
          sshClient.onData((data) => {
            socket.emit('data', data);
          });

          // Register error handler for new socket
          sshClient.onError((error) => {
            socket.emit('error', { message: error.message });
          });

          // Register channel close handler to clean up state
          sshClient.onChannelClose(() => {
            console.log('Shell channel closed for session', existingSession!.id);
          });

          setupSocketListeners(socket, sshClient);
          sshClient.resize(rows || 24, cols || 80);

          // 发送 connected 事件通知前端会话已复用
          socket.emit('connected', { reused: true });

          // 发送历史记录
          socket.emit('data', historyToSend);

          return;
        }

        const sshClient = new SSHClient();

        const connectOptions: any = {
          host: host,
          port: port || 22,
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
