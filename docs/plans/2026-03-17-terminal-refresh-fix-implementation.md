# Terminal Refresh Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix terminal page refresh issue by adding output buffering in SSHClient and properly replaying history to new sockets.

**Architecture:** Add output buffer to SSHClient, modify socket.io to send buffer when reusing sessions.

**Tech Stack:** Node.js, TypeScript, Fastify, Socket.IO, ssh2

---

### Task 1: Add output buffer to SSHClient

**Files:**
- Modify: `backend/src/services/ssh.ts`

**Step 1: Read the current SSHClient file**

Already read, we know the structure.

**Step 2: Add output buffer properties to SSHClient class**

Add after line 27 (after `private connected: boolean = false;`):

```typescript
  private outputBuffer: string = '';
  private readonly MAX_BUFFER_SIZE = 100000; // 100KB max buffer
```

**Step 3: Modify channel.on('data') handler to buffer output**

Replace lines 61-65 (the channel data handler) with:

```typescript
          channel.on('data', (data: Buffer) => {
            const str = data.toString();
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
```

**Step 4: Add getOutputBuffer() method**

Add after line 115 (after `isConnected()` method):

```typescript
  getOutputBuffer(): string {
    return this.outputBuffer;
  }
```

**Step 5: Verify the file compiles**

Run:
```bash
cd backend
npx tsc --noEmit
```
Expected: No errors

**Step 6: Commit the change**

```bash
git add backend/src/services/ssh.ts
git commit -m "feat: add output buffering to SSHClient"
```

---

### Task 2: Fix socket.io session reuse logic

**Files:**
- Modify: `backend/src/plugins/socket.io.ts`

**Step 1: Read the current socket.io.ts file**

Already read, we know the structure.

**Step 2: Modify the existing session reuse section**

Remove the duplicate event handler registration that was added in the recent commit. The SSHClient's onData/onError replace handlers, so we should only register them once.

Replace lines 49-71 (the existingSession block) with:

```typescript
        let existingSession = sessionManager.getSessionByConnection(userId, connectionId);
        if (existingSession) {
          console.log('Reusing existing session');
          const sshClient = existingSession.sshClient;

          socket.data.sessionId = existingSession.id;
          sessionManager.updateActivity(existingSession.id);

          // First send any buffered output history
          const buffer = sshClient.getOutputBuffer();
          if (buffer) {
            socket.emit('data', buffer);
          }

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

          socket.emit('connected');
          return;
        }
```

**Step 3: Verify the file compiles**

Run:
```bash
cd backend
npx tsc --noEmit
```
Expected: No errors

**Step 4: Commit the change**

```bash
git add backend/src/plugins/socket.io.ts
git commit -m "fix: send buffer history when reusing SSH session"
```

---

### Task 3: Test the fix manually

**Files:** None - manual testing

**Step 1: Start backend server**

First check for port conflicts:
```bash
lsof -ti :8080 | xargs -r kill -9
```

Then start:
```bash
cd backend
pnpm dev
```

**Step 2: Start frontend server**

In another terminal:
```bash
lsof -ti :5173 | xargs -r kill -9
cd frontend
pnpm dev
```

**Step 3: Test the refresh scenario**

1. Open browser to http://localhost:5173
2. Create a connection and connect to SSH
3. Run some commands (e.g., `ls -la`, `echo hello`)
4. Refresh the browser page
5. Verify:
   - Terminal shows previous output (history)
   - Can continue typing new commands
   - No console errors

**Step 4: Verify the terminal works correctly**

Test that:
- Typing works
- Output displays correctly
- Disconnect button works
- Refreshing multiple times works

---

### Task 4: Run existing tests

**Files:**
- Test: `backend/src/services/__tests__/ssh.test.ts`
- Test: `backend/src/plugins/__tests__/socket.io.test.ts`

**Step 1: Run backend tests**

```bash
cd backend
pnpm test:run
```

Expected: All tests pass

**Step 2: If tests fail, fix them**

If any tests fail, debug and fix them.

**Step 3: Commit test fixes (if needed)**

Only if there were test failures:
```bash
git add backend/src/services/__tests__/ssh.test.ts
git commit -m "test: update tests for output buffer"
```
