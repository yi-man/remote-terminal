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
