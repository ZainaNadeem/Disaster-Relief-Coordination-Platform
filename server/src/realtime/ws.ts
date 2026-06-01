import type { Server } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';

// Each connected socket, once it has completed its handshake, carries the
// incident it's watching and the authenticated user.
interface WatcherSocket extends WebSocket {
  incidentId?: string;
  user?: JwtPayload;
  isAuthed?: boolean;
}

// The event shape we broadcast to clients.
export interface BroadcastEvent {
  type: string;
  entity: string;
  data: unknown;
}

// Registry: incidentId -> set of sockets watching that incident.
const rooms = new Map<string, Set<WatcherSocket>>();

// Clients must complete the handshake within this window or get disconnected.
const HANDSHAKE_TIMEOUT_MS = 10_000;

function addToRoom(incidentId: string, socket: WatcherSocket): void {
  let room = rooms.get(incidentId);
  if (!room) {
    room = new Set();
    rooms.set(incidentId, room);
  }
  room.add(socket);
}

function removeFromRoom(socket: WatcherSocket): void {
  const incidentId = socket.incidentId;
  if (!incidentId) return;
  const room = rooms.get(incidentId);
  if (!room) return;
  room.delete(socket);
  if (room.size === 0) rooms.delete(incidentId);
}

// Send an event to every client watching the given incident.
export function broadcast(incidentId: string, event: BroadcastEvent): void {
  const room = rooms.get(incidentId);
  if (!room) return;
  const message = JSON.stringify(event);
  for (const socket of room) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
}

// Attach a WebSocket server to the existing HTTP server (shares the port).
export function initWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WatcherSocket) => {
    ws.isAuthed = false;

    // Drop sockets that never send a valid handshake.
    const timer = setTimeout(() => {
      if (!ws.isAuthed) {
        ws.close(4408, 'Handshake timeout');
      }
    }, HANDSHAKE_TIMEOUT_MS);

    ws.on('message', (raw) => {
      // After a successful handshake, ignore further client messages.
      if (ws.isAuthed) return;

      let payload: { token?: unknown; incident_id?: unknown };
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        ws.close(4400, 'Invalid JSON handshake');
        return;
      }

      const { token, incident_id } = payload;
      if (typeof token !== 'string' || typeof incident_id !== 'string') {
        ws.close(4400, 'Handshake requires { token, incident_id }');
        return;
      }

      let user: JwtPayload;
      try {
        user = verifyToken(token);
      } catch {
        ws.close(4401, 'Invalid or expired token');
        return;
      }

      // Handshake OK — register the socket under its incident.
      clearTimeout(timer);
      ws.isAuthed = true;
      ws.user = user;
      ws.incidentId = incident_id;
      addToRoom(incident_id, ws);
      ws.send(JSON.stringify({ type: 'connected', entity: 'incident', data: { incident_id } }));
    });

    ws.on('close', () => {
      clearTimeout(timer);
      removeFromRoom(ws);
    });

    ws.on('error', () => {
      clearTimeout(timer);
      removeFromRoom(ws);
    });
  });

  return wss;
}
