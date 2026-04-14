import { useState, useEffect, useRef, useCallback } from 'react';

export interface LogLine {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  runId?: string;
}

export function useWebSocket(url: string = 'ws://localhost:4000/ws/logs') {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const log: LogLine = JSON.parse(event.data);
        setLogs((prev) => [...prev, log]);
      } catch {
        setLogs((prev) => [
          ...prev,
          { timestamp: new Date().toISOString(), level: 'info', message: event.data },
        ]);
      }
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { logs, connected, clearLogs };
}
