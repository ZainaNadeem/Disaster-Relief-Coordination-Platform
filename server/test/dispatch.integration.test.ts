import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import express from 'express';
import { WebSocket } from 'ws';

test('50 competing dispatches produce one assignment and one WebSocket event', { timeout: 20_000 }, async (t) => {
  assert.ok(process.env.TEST_DATABASE_URL, 'Set TEST_DATABASE_URL to a dedicated, migrated PostgreSQL test database');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.JWT_SECRET = randomUUID();

  const { prisma } = await import('../src/lib/prisma.js');
  const { signToken } = await import('../src/lib/jwt.js');
  const { authenticateToken } = await import('../src/middleware/auth.js');
  const { initWebSocket } = await import('../src/realtime/ws.js');
  const { resourcesRouter } = await import('../src/routes/resources.js');
  const app = express();
  app.use(express.json());
  app.use('/resources', authenticateToken, resourcesRouter);
  const server = createServer(app);
  const wss = initWebSocket(server);
  const runId = randomUUID();
  const emails = [`dispatch-a-${runId}@example.test`, `dispatch-b-${runId}@example.test`];
  let incidentId: string | undefined;
  t.after(async () => {
    for (const client of wss.clients) client.terminate();
    wss.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      if (incidentId) await prisma.incident.delete({ where: { id: incidentId } });
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    } finally {
      await prisma.$disconnect();
    }
  });
  const users = [];
  for (const email of emails) {
    users.push(await prisma.user.create({ data: { email, name: email, hashedPassword: 'unused-test-value' } }));
  }
  const incident = await prisma.incident.create({
    data: { title: 'Dispatch concurrency test', description: runId, lat: 0, lng: 0 },
  });
  incidentId = incident.id;
  const resource = await prisma.resource.create({
    data: { name: 'Test supplies', type: 'test', incidentId, quantity: 1 },
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const token = signToken({ sub: users[0].id, email: users[0].email, role: users[0].role });
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
  const broadcasts: Array<{ data: { id: string; assignedTo: string } }> = [];
  socket.on('message', (raw) => {
    const event = JSON.parse(raw.toString());
    if (event.type === 'resource.dispatched') broadcasts.push(event);
  });
  await once(socket, 'open');
  const connected = once(socket, 'message');
  socket.send(JSON.stringify({ token, incident_id: incidentId }));
  const [handshake] = await connected;
  assert.equal(JSON.parse(handshake.toString()).type, 'connected');

  const dispatch = (assignedTo: string) => fetch(
    `http://127.0.0.1:${address.port}/resources/${resource.id}/dispatch`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedTo }), signal: AbortSignal.timeout(10_000) },
  ).then(async (response) => ({ status: response.status, body: await response.json() }));
  const results = await Promise.all(Array.from({ length: 50 }, (_, i) => dispatch(users[i % 2].id)));
  const wins = results.filter((result) => result.status === 200);
  assert.equal(wins.length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 49);
  const stored = await prisma.resource.findUniqueOrThrow({ where: { id: resource.id } });
  assert.equal(stored.status, 'DISPATCHED');
  assert.equal(stored.assignedTo, wins[0].body.assignedTo);
  const pong = once(socket, 'pong');
  socket.ping(); // Drain broadcasts already queued by the completed requests.
  await pong;
  assert.equal(broadcasts.length, 1);
  assert.equal(broadcasts[0].data.id, resource.id);
  assert.equal(broadcasts[0].data.assignedTo, stored.assignedTo);
});
