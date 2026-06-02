'use client';

import { useEffect, useRef, useState } from 'react';
import { getToken } from './auth';
import type { WsEvent } from './types';

export type SocketStatus = 'connecting' | 'open' | 'closed';

// Build the ws:// (or wss://) URL from the HTTP API base.
function wsUrl(incidentId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return `${base.replace(/^http/, 'ws')}/ws?incident_id=${encodeURIComponent(incidentId)}`;
}

// Opens a WebSocket to the incident's room, performs the { token, incident_id }
// handshake, forwards each event to `onEvent`, and automatically reconnects with
// exponential backoff if the connection drops.
export function useIncidentSocket(incidentId: string, onEvent: (event: WsEvent) => void): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>('connecting');

  // Keep the latest callback without forcing a reconnect when it changes.
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!incidentId) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;

    function connect() {
      setStatus('connecting');
      ws = new WebSocket(wsUrl(incidentId));

      ws.onopen = () => {
        attempt = 0;
        // The server authenticates via this handshake message, not the query string.
        ws?.send(JSON.stringify({ token: getToken(), incident_id: incidentId }));
        setStatus('open');
      };

      ws.onmessage = (e) => {
        try {
          onEventRef.current(JSON.parse(e.data) as WsEvent);
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        setStatus('closed');
        if (!disposed) scheduleReconnect();
      };

      ws.onerror = () => {
        // Triggers onclose, which handles the reconnect.
        ws?.close();
      };
    }

    function scheduleReconnect() {
      attempt += 1;
      const delay = Math.min(1000 * 2 ** (attempt - 1), 15000); // 1s, 2s, 4s … capped at 15s
      reconnectTimer = setTimeout(connect, delay);
    }

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [incidentId]);

  return status;
}
