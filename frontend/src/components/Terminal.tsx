import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Toolbar } from './Toolbar';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  connectionId: string;
  onDisconnect: () => void;
}

export function Terminal({ connectionId, onDisconnect }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [connected, setConnected] = useState(false);

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

    // 模拟连接
    setTimeout(() => {
      terminal.writeln('\x1b[1;32m✓ Connected successfully!\x1b[0m');
      terminal.writeln('Welcome to Remote Terminal');
      terminal.writeln('');
      terminal.write('$ ');
      setConnected(true);
    }, 500);

    terminal.onData((data) => {
      terminal.write(data);
      if (data === '\r') {
        terminal.write('\n$ ');
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };

    window.addEventListener('resize', handleResize);

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
        terminal.write('\x1b');
        break;
      case 'tab':
        terminal.write('\t');
        break;
      case 'up':
        terminal.write('\x1b[A');
        break;
      case 'down':
        terminal.write('\x1b[B');
        break;
      case 'left':
        terminal.write('\x1b[D');
        break;
      case 'right':
        terminal.write('\x1b[C');
        break;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span className="text-gray-300 text-sm">
            {connected ? '已连接' : '连接中...'}
          </span>
        </div>
        <button
          onClick={onDisconnect}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
        >
          断开
        </button>
      </div>
      <div ref={terminalRef} className="flex-1" />
      <Toolbar onKeyPress={handleKeyPress} />
    </div>
  );
}
