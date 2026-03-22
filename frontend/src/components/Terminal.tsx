import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Toolbar } from './Toolbar';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUserId } from '../hooks/useUserId';
import '@xterm/xterm/css/xterm.css';

// In-memory "forceNew" handoff between an explicit disconnect click and the next Terminal mount.
// This avoids relying on browser storage being reliably writable/parsable in CI.
const pendingForceNewByConnectionId = new Map<string, number>();
const FORCE_NEW_TTL_MS = 60_000;

interface TerminalProps {
  connectionId: string;
  onDisconnect: () => void;
}

export function Terminal({ connectionId, onDisconnect }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const isDisposedRef = useRef<boolean>(false);
  const userId = useUserId();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const outputMirrorRef = useRef<string>('');
  const [outputMirror, setOutputMirror] = useState<string>('');

  const { connected, connecting, reused, connect, disconnect, sendData, resize, killSession } = useWebSocket({
    userId,
    connectionId,
    onConnected: () => {
      setErrorMessage(null);
    },
    onData: (data) => {
      xtermRef.current?.write(data);
      // Stable observability point for tests (xterm output can be hard to assert).
      // Keep a bounded mirror of recent output.
      outputMirrorRef.current = (outputMirrorRef.current + data).slice(-20_000);
      setOutputMirror(outputMirrorRef.current);
    },
    onError: (error) => {
      setErrorMessage(error);
    },
  });

  const epochKey = `rt_epoch:${connectionId}`;
  const forceNewKey = `rt_force_new_session:${connectionId}`;

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

    // 确保在终端打开后稍等一下再调用 fit
    // 这样可以避免 fitAddon 在元素未完全准备好时就尝试调整大小
    terminal.open(terminalRef.current);

    // 使用 requestAnimationFrame 确保 DOM 已完全渲染
    requestAnimationFrame(() => {
      try {
        if (fitAddon && terminalRef.current && !isDisposedRef.current) {
          fitAddon.fit();
        }
      } catch (error) {
        console.error('FitAddon error during initialization:', error);
      }
    });

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    terminal.onData((data) => {
      sendData(data);
    });

    const handleResize = () => {
      if (!isDisposedRef.current && fitAddonRef.current && xtermRef.current) {
        try {
          fitAddonRef.current.fit();
          if (connected) {
            resize(xtermRef.current.rows, xtermRef.current.cols);
          }
        } catch (error) {
          console.error('FitAddon error:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);

    const fromMemory = (() => {
      const ts = pendingForceNewByConnectionId.get(connectionId);
      if (!ts) return false;
      if (Date.now() - ts > FORCE_NEW_TTL_MS) {
        pendingForceNewByConnectionId.delete(connectionId);
        return false;
      }
      return true;
    })();

    const fromSessionStorage = sessionStorage.getItem(forceNewKey) === '1';
    const forceNew = fromMemory || fromSessionStorage;
    if (forceNew) sessionStorage.removeItem(forceNewKey);
    connect(terminal.rows, terminal.cols, { forceNew });

    return () => {
      isDisposedRef.current = true;
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      xtermRef.current = null;
      fitAddonRef.current = null;
      // 先断开 socket 连接，再清理终端
      disconnect();
      terminal.dispose();
    };
  }, [connectionId]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Prevent accidental refresh/close while user is on terminal page.
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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

  const handleDisconnect = async () => {
    // 立即标记为已废弃，防止后续操作
    isDisposedRef.current = true;
    // Explicit disconnect: force server to create a non-reusable session on next connect.
    try {
      sessionStorage.setItem(forceNewKey, '1');
      pendingForceNewByConnectionId.set(connectionId, Date.now());
    } catch {
      // Fallback to in-memory even if storage is unavailable.
      pendingForceNewByConnectionId.set(connectionId, Date.now());
      // ignore
    }
    // Advance epoch locally so the next connect can't reuse an old session
    // even if kill-session cannot be delivered due to websocket instability.
    try {
      const raw = sessionStorage.getItem(epochKey);
      const n = raw ? Number(raw) : 0;
      const next = (Number.isFinite(n) ? n : 0) + 1;
      sessionStorage.setItem(epochKey, String(next));
    } catch {
      // ignore
    }
    // 发送 kill-session 事件来真正终止 SSH 会话
    await killSession();
    // 断开 socket 连接
    disconnect();
    // 直接调用 onDisconnect 导航回列表页面
    // 这样可以避免在组件仍然存在时尝试访问已废弃的 terminal 对象
    onDisconnect();
  };

  const handleDisconnectClick = () => {
    if (!confirm('确定要断开当前终端连接吗？')) {
      return;
    }
    void handleDisconnect();
  };

  const getStatusText = () => {
    if (errorMessage) return '连接失败';
    if (connected) return reused ? '已连接（复用）' : '已连接';
    if (connecting) return '连接中...';
    return '未连接';
  };

  return (
    <div data-testid="terminal-page" className="flex flex-col h-full bg-gray-900">
      <pre data-testid="terminal-output-mirror" className="sr-only whitespace-pre-wrap">
        {outputMirror}
      </pre>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div data-testid="connection-status" className={`w-2 h-2 rounded-full ${
          errorMessage ? 'bg-red-500' :
          connected ? 'bg-green-500' :
          'bg-yellow-500'
        }`} />
          <span data-testid="connection-status-text" className="text-gray-300 text-sm">
            {getStatusText()}
          </span>
        </div>
        <button
          onClick={handleDisconnectClick}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          断开
        </button>
      </div>
      {errorMessage && (
        <div data-testid="error-message" className="px-4 py-2 bg-red-900/50 border-b border-red-700">
          <p className="text-red-300 text-sm">{errorMessage}</p>
        </div>
      )}
      <div data-testid="terminal-container" ref={terminalRef} className="flex-1 min-h-0 overflow-hidden" />
      <Toolbar onKeyPress={handleKeyPress} />
    </div>
  );
}
