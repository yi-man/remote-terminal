// SSH 服务暂时简化，仅保留占位符
export class SSHClient {
  private connected: boolean;

  constructor() {
    this.connected = false;
  }

  async connect(options: any): Promise<void> {
    // 模拟 SSH 连接
    this.connected = true;
    console.log('SSH connected (simulated)');
  }

  async destroy(): Promise<void> {
    this.connected = false;
    console.log('SSH disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }
}
