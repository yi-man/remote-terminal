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
  private onChannelCloseHandler: (() => void) | null = null;
  private connected: boolean = false;
  private outputBuffer: string = '';
  private readonly MAX_BUFFER_SIZE = 100000; // 100KB max buffer
  private connectOptions: SSHConnectOptions | null = null;

  async connect(options: SSHConnectOptions): Promise<void> {
    this.connectOptions = options;
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
        this.createShell(resolve, reject);
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

  /**
   * 创建一个新的 shell 通道，用于复用已存在的 SSH 连接
   */
  async recreateShell(): Promise<void> {
    if (!this.client || !this.connectOptions) {
      throw new Error('SSH client not connected');
    }

    // 清理旧的 shell 通道
    if (this.shellChannel) {
      this.shellChannel.end();
      this.shellChannel = null;
    }

    return new Promise((resolve, reject) => {
      // 尝试重新创建 shell，如果失败则重新连接
      this.createShell(resolve, (err) => {
        console.log('Create shell failed, trying to reconnect:', err.message);
        // shell 创建失败，尝试完全重新连接
        this.connect(this.connectOptions!).then(resolve).catch(reject);
      });
    });
  }

  /**
   * 内部方法：创建 shell 通道
   */
  private createShell(resolve: (value: void) => void, reject: (reason: any) => void) {
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
        const str = data.toString('utf8');
        // Add to buffer
        this.outputBuffer += str;
        // Limit buffer size to prevent memory issues
        if (this.outputBuffer.length > this.MAX_BUFFER_SIZE) {
          this.outputBuffer = this.outputBuffer.slice(-this.MAX_BUFFER_SIZE);
        }
        // Call the user handler if set
        if (this.onDataHandler) {
          this.onDataHandler(str);
        }
      });

      channel.on('close', () => {
        console.log('Shell channel closed');
        this.connected = false;
        if (this.onChannelCloseHandler) {
          this.onChannelCloseHandler();
        }
      });

      channel.stderr.on('data', (data: Buffer) => {
        console.error('SSH stderr:', data.toString());
      });

      resolve();
    });
  }

  /**
   * 注册 shell 通道关闭时的回调
   */
  onChannelClose(handler: () => void): void {
    this.onChannelCloseHandler = handler;
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

  getOutputBuffer(): string {
    return this.outputBuffer;
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
