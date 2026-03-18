# Terminal 页面刷新异常修复设计

## 问题描述

当用户在 `Terminal` 页面刷新浏览器时，会出现以下问题：
- 页面上的终端区域无任何内容显示
- 浏览器控制台出现错误信息
- 终端无法正常连接或响应输入

## 问题分析

### 根因1：Session 复用逻辑问题
后端 `socket.io.ts` 在处理 `connect-ssh` 事件时，会检查是否存在已有的会话（`existingSession`）。如果有，则会复用该会话。但在复用过程中：
- 会重复调用 `onData` 和 `onError` 事件处理器的注册
- 新连接的 socket 无法获取之前的终端输出历史

### 根因2：终端输出无缓冲
`SSHClient` 类中没有对终端输出进行缓冲，当客户端刷新后：
- 新的 xterm 实例是空的
- 无法看到之前的操作和输出

### 根因3：事件处理器管理混乱
虽然 `SSHClient` 使用单一处理器（替换而非追加），但在 session 复用时，逻辑顺序可能导致问题。

## 解决方案设计

### 核心方案：输出缓冲 + 历史重放

#### 1. SSHClient 增强（后端）
在 `SSHClient` 类中添加输出缓冲区：
```typescript
private outputBuffer: string = '';
private readonly MAX_BUFFER_SIZE = 100000; // 限制缓冲大小为 100KB

// 接收数据时自动缓冲
channel.on('data', (data: Buffer) => {
  const str = data.toString();
  this.outputBuffer += str;
  // 限制缓冲区大小，防止内存泄漏
  if (this.outputBuffer.length > this.MAX_BUFFER_SIZE) {
    this.outputBuffer = this.outputBuffer.slice(-this.MAX_BUFFER_SIZE);
  }
  // 调用用户提供的处理器
  if (this.onDataHandler) {
    this.onDataHandler(str);
  }
});

// 获取历史输出
getOutputBuffer(): string {
  return this.outputBuffer;
}
```

#### 2. Socket.IO 逻辑优化（后端）
在 `socket.io.ts` 的 `connect-ssh` 处理中：
```typescript
// 复用现有会话时
if (existingSession) {
  console.log('Reusing existing session');
  const sshClient = existingSession.sshClient;

  socket.data.sessionId = existingSession.id;
  sessionManager.updateActivity(existingSession.id);

  // 发送历史缓冲
  const buffer = sshClient.getOutputBuffer();
  if (buffer) {
    socket.emit('data', buffer);
  }

  // 注册事件处理器（替换原处理器）
  sshClient.onData((data) => {
    socket.emit('data', data);
  });

  sshClient.onError((error) => {
    socket.emit('error', { message: error.message });
  });

  setupSocketListeners(socket, sshClient);
  sshClient.resize(rows || 24, cols || 80);

  socket.emit('connected');
  return;
}
```

#### 3. 前端组件优化（可选）
确保 `Terminal.tsx` 中 xterm 初始化和 socket 连接顺序正确：
1. 先创建 xterm 实例
2. 再连接 WebSocket
3. 收到历史数据后立即写入

## 数据流程

```
页面刷新 → Terminal组件挂载 → 创建xterm实例 → 连接WebSocket
                                                         ↓
后端收到connect-ssh → 查找现有session → 发送历史buffer → 注册新处理器 → 发送connected
         ↓
前端收到data(历史) → 写入xterm → 收到connected → 显示正常
```

## 实现改动点

### 后端文件
1. `backend/src/services/ssh.ts` - 添加输出缓冲功能
2. `backend/src/plugins/socket.io.ts` - 优化session复用逻辑

### 前端文件（如有需要）
1. `frontend/src/components/Terminal.tsx` - 确保组件初始化顺序

## 优势

1. **完整用户体验**：刷新后能看到之前的终端输出
2. **真正的会话保持**：不中断SSH连接，只是重定向到新socket
3. **性能优化**：合理的缓冲区大小限制
4. **简单可靠**：核心改动最小，风险可控

## 测试建议

1. **正常刷新测试**：在有内容的终端页面刷新，验证是否显示历史输出
2. **大量输出测试**：运行 `ls -laR /` 等大量输出命令，验证缓冲功能
3. **超时测试**：超过会话超时后刷新，验证重新连接逻辑
