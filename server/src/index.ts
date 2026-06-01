import { createServer } from 'node:http';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { Role } from '@prisma/client';
import { prisma } from './lib/prisma.js';
import { authRouter } from './routes/auth.js';
import { incidentsRouter } from './routes/incidents.js';
import { tasksRouter } from './routes/tasks.js';
import { resourcesRouter } from './routes/resources.js';
import { authenticateToken, requireRole } from './middleware/auth.js';
import { initWebSocket } from './realtime/ws.js';

const app = express();
const port = Number(process.env.SERVER_PORT) || 4000;

app.use(cors());
app.use(express.json());

// Authentication endpoints: POST /auth/register and POST /auth/login.
app.use('/auth', authRouter);

app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Confirm the database is reachable.
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', service: 'server', db: 'up', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'server', db: 'down' });
  }
});

app.get('/api', (_req: Request, res: Response) => {
  res.json({ message: 'Disaster Relief Coordination Platform API' });
});

// Example protected route: any authenticated user. Returns the caller's identity
// taken from their JWT.
app.get('/me', authenticateToken, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// Example admin-only route: requires a valid token AND the ADMIN role.
app.get('/admin/ping', authenticateToken, requireRole(Role.ADMIN), (_req: Request, res: Response) => {
  res.json({ message: 'pong (admin only)' });
});

// Domain routes — all require a valid JWT (authenticateToken). Admin-only
// actions are additionally guarded inside the routers via requireRole.
app.use('/incidents', authenticateToken, incidentsRouter);
app.use('/tasks', authenticateToken, tasksRouter);
app.use('/resources', authenticateToken, resourcesRouter);

// Wrap Express in an HTTP server so the WebSocket server can share the port.
const server = createServer(app);
initWebSocket(server);

server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port} (WebSocket at ws://localhost:${port}/ws)`);
});
