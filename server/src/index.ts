import express, { type Request, type Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import { prisma } from './lib/prisma.js';

const app = express();
const port = Number(process.env.SERVER_PORT) || 4000;

app.use(cors());
app.use(express.json());

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

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
