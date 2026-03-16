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
