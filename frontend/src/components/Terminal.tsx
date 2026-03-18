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
      // 检查 terminal 是否还存在且有效
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

    connect(terminal.rows, terminal.cols);

    return () => {
      isDisposedRef.current = true;
      window.removeEventListener('resize', handleResize);
      // 清理引用，避免访问已销毁对象
      xtermRef.current = null;
      fitAddonRef.current = null;
      // 先断开 socket 连接，再清理终端
      disconnect();
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

  const handleDisconnect = async () => {
    // 立即标记为已废弃，防止后续操作
    isDisposedRef.current = true;
    // 发送 kill-session 事件来真正终止 SSH 会话
    await killSession();
    // 断开 socket 连接
    disconnect();
    // 直接调用 onDisconnect 导航回列表页面
    // 这样可以避免在组件仍然存在时尝试访问已废弃的 terminal 对象
    onDisconnect();
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
          onClick={handleDisconnect}
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
      <div data-testid="terminal-container" ref={terminalRef} className="flex-1" />
      <Toolbar onKeyPress={handleKeyPress} />
    </div>
  );
}
