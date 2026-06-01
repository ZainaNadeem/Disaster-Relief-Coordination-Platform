# Disaster Relief Coordination Platform

A monorepo using npm workspaces.

## Structure

```
.
├── client/   # Next.js + TypeScript + Tailwind
├── server/   # Node.js + Express + TypeScript
└── docker-compose.yml  # client + server + PostgreSQL
```

## Local development (without Docker)

```bash
npm install            # installs all workspaces
cp .env.example .env

npm run dev:server     # http://localhost:4000
npm run dev:client     # http://localhost:3000
```

Or run both at once:

```bash
npm run dev
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

- Client: http://localhost:3000
- Server: http://localhost:4000 (`/health`, `/api`)
- PostgreSQL: localhost:5432

## Database (Prisma + PostgreSQL)

The server uses [Prisma](https://www.prisma.io/) with PostgreSQL. The schema
(models `User`, `Incident`, `Resource`, `Task`) lives in
`server/prisma/schema.prisma`.

```bash
# apply migrations to a running database
npm run prisma:migrate --workspace server
# regenerate the typed client after editing the schema
npm run prisma:generate --workspace server
# browse data in a GUI
npm run prisma:studio --workspace server
```

`DATABASE_URL` is read from `server/.env` (see `.env.example`).

## Authentication

JWT-based auth (bcrypt password hashing, 8-hour signed tokens). Set `JWT_SECRET`
in your env.

| Endpoint              | Auth                  | Description                              |
| --------------------- | --------------------- | ---------------------------------------- |
| `POST /auth/register` | public                | Create a user, returns user + JWT        |
| `POST /auth/login`    | public                | Verify credentials, returns user + JWT   |
| `GET /me`             | Bearer token          | Returns the caller's token payload       |
| `GET /admin/ping`     | Bearer token + ADMIN  | Example admin-only route                 |

Protect your own routes with the `authenticateToken` and `requireRole(role)`
middleware in `server/src/middleware/auth.ts`.

```bash
# register
curl -X POST localhost:4000/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"secret123","role":"ADMIN"}'
# login, then call a protected route
TOKEN=$(curl -s -X POST localhost:4000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"secret123"}' | jq -r .token)
curl localhost:4000/me -H "Authorization: Bearer $TOKEN"
```

## Domain API

All routes below require `Authorization: Bearer <token>`. Request bodies are
validated with [zod](https://zod.dev/); invalid input returns `400` with field
details.

| Method & path                     | Access       | Description                              |
| --------------------------------- | ------------ | ---------------------------------------- |
| `POST /incidents`                 | ADMIN        | Create an incident                       |
| `GET /incidents`                  | any auth     | List active incidents                    |
| `GET /incidents/:id`              | any auth     | Get incident with its tasks & resources  |
| `PATCH /incidents/:id/status`     | ADMIN        | Update incident status                   |
| `POST /incidents/:id/tasks`       | any auth     | Create a task under the incident         |
| `PATCH /tasks/:id`                | any auth     | Update a task's status and/or assignee   |
| `POST /incidents/:id/resources`   | any auth     | Add a resource to the incident           |
| `PATCH /resources/:id/dispatch`   | any auth     | Assign a resource to a user (DISPATCHED) |

## Real-time updates (WebSocket)

A WebSocket server (`ws`) runs on the same port at `ws://localhost:4000/ws`.
After connecting, send a JSON handshake to authenticate and subscribe to an
incident:

```json
{ "token": "<JWT>", "incident_id": "<incident id>" }
```

The server validates the JWT and registers the socket under that incident.
Updates to that incident are pushed as `{ type, entity, data }`:

| Triggered by                     | Event                                       |
| -------------------------------- | ------------------------------------------- |
| `PATCH /tasks/:id`               | `{ type: "task.updated", entity: "task", ... }`         |
| `PATCH /resources/:id/dispatch`  | `{ type: "resource.dispatched", entity: "resource", ... }` |

```js
const ws = new WebSocket('ws://localhost:4000/ws');
ws.onopen = () => ws.send(JSON.stringify({ token, incident_id }));
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

## Workspace scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Run all workspaces in dev mode       |
| `npm run build`      | Build all workspaces                 |
| `npm run lint`       | Lint/type-check all workspaces       |
