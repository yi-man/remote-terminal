import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  userId: string;
  connectionId: string;
  onConnected?: () => void;
  onData?: (data: string) => void;
  onError?: (error: string) => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const { userId, connectionId, onConnected, onData, onError, onDisconnect } = options;
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [reused, setReused] = useState(false);
  const epochKey = `rt_epoch:${connectionId}`;
  const epochRef = useRef<number>(0);
  const lastEpochKeyRef = useRef<string>('');

  // Synchronously load epoch for the current connectionId so that even if the
  // websocket connects immediately, we still send the correct clientEpoch.
  if (lastEpochKeyRef.current !== epochKey) {
    lastEpochKeyRef.current = epochKey;
    try {
      const raw = localStorage.getItem(epochKey);
      const n = raw ? Number(raw) : 0;
      epochRef.current = Number.isFinite(n) ? n : 0;
    } catch {
      epochRef.current = 0;
    }
  }

  const connect = useCallback((rows: number = 24, cols: number = 80) => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnecting(true);
    setReused(false);

    const socket = io({
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('connect-ssh', { userId, connectionId, rows, cols, clientEpoch: epochRef.current });
    });

    socket.on('connected', (data?: any) => {
      console.log('SSH connected', data);
      setConnected(true);
      setConnecting(false);
      setReused(!!data?.reused);
      if (typeof data?.epoch === 'number') {
        epochRef.current = data.epoch;
        localStorage.setItem(epochKey, String(epochRef.current));
      }
      onConnected?.();
    });

    socket.on('data', (data: string) => {
      onData?.(data);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      setConnecting(false);
      setReused(false);
      onError?.(error.message);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      setReused(false);
      onDisconnect?.();
    });

    // 不再返回清理函数，因为 connect 可能会被多次调用，需要确保只清理正确的 socket
    // 所有清理都应该在 disconnect 函数中统一处理
  }, [userId, connectionId, onConnected, onData, onError, onDisconnect]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setConnecting(false);
      setReused(false);
    }
  }, []);

  const sendData = useCallback((data: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('data', data);
    }
  }, []);

  const resize = useCallback((rows: number, cols: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('resize', { rows, cols });
    }
  }, []);

  const killSession = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      // Advance epoch locally so the next connect won't reuse even if kill-session
      // cannot be delivered due to websocket instability.
      epochRef.current += 1;
      localStorage.setItem(epochKey, String(epochRef.current));

      if (!socketRef.current?.connected) {
        resolve();
        return;
      }

      // Don't block UI forever if the websocket is unstable.
      const timeoutMs = 1000;
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve();
      }, timeoutMs);

      socketRef.current.emit('kill-session', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      });
    });
  }, [epochKey]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    connecting,
    reused,
    connect,
    disconnect,
    sendData,
    resize,
    killSession,
  };
}
