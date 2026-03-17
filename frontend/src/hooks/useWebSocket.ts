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

  const connect = useCallback((rows: number = 24, cols: number = 80) => {
    if (socketRef.current?.connected) {
      return;
    }

    setConnecting(true);

    const socket = io({
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      socket.emit('connect-ssh', { userId, connectionId, rows, cols });
    });

    socket.on('connected', () => {
      console.log('SSH connected');
      setConnected(true);
      setConnecting(false);
      onConnected?.();
    });

    socket.on('data', (data: string) => {
      onData?.(data);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('WebSocket error:', error);
      setConnected(false);
      setConnecting(false);
      onError?.(error.message);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      onDisconnect?.();
    });

    return () => {
      socket.disconnect();
    };
  }, [userId, connectionId, onConnected, onData, onError, onDisconnect]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setConnecting(false);
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

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    connecting,
    connect,
    disconnect,
    sendData,
    resize,
  };
}
