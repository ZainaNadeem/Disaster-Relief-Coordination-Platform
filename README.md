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
cp .env.example .env   # fill in values
docker compose up --build
```

Three services, all configured from `.env`:

- **postgres** (`postgres:15`) — `localhost:5432`, with a `pg_isready` healthcheck.
- **server** — builds from `./server`; waits for postgres to be healthy, runs
  `prisma migrate deploy`, then starts the app on `localhost:4000`.
- **client** — builds from `./client`; `NEXT_PUBLIC_API_URL=http://localhost:4000`,
  served on `localhost:3000`.

> If you ran an older `postgres:16` image before, run `docker compose down -v`
> once — the old data volume isn't compatible with `postgres:15`.

## Client (Next.js)

App Router + TypeScript + Tailwind. Configure `client/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_MAPBOX_TOKEN=<your-mapbox-token>
```

Routes: `/login`, `/register`, `/dashboard` (protected), `/incidents/[id]`
(protected). Protected routes use a client-side `AuthGuard`. All API calls go
through an axios instance (`src/lib/api.ts`) that attaches the JWT from
`localStorage` and redirects to `/login` on `401`.

The dashboard shows a stats bar (active incidents / open tasks / dispatched
resources from `GET /incidents`), the `<IncidentMap />` (mapbox-gl +
react-map-gl) plotting colored markers — red = active with high-priority tasks,
amber = active, green = resolved — with popups linking to each incident, and a
sidebar of active incidents sorted by open-task count. Admins get an **Add
Incident** modal with a Mapbox geocoder for location. Needs
`NEXT_PUBLIC_MAPBOX_TOKEN` to display the map/geocoder.

The `/incidents/[id]` page is a live three-panel view: incident info (left), a
drag-and-drop task board with OPEN / IN_PROGRESS / DONE columns powered by
`@dnd-kit/core` (center), and a resource list with an admin-only **Dispatch**
button (right). All three panels update in real time over a WebSocket
(`/ws?incident_id=…`) with automatic reconnection.

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
| `GET /incidents/map`              | any auth     | Active incidents as a GeoJSON FeatureCollection |
| `GET /incidents/:id`              | any auth     | Get incident with its tasks & resources  |
| `PATCH /incidents/:id/status`     | ADMIN        | Update incident status                   |
| `POST /incidents/:id/tasks`       | any auth     | Create a task under the incident         |
| `PATCH /tasks/:id`                | any auth     | Update a task's status and/or assignee   |
| `POST /incidents/:id/resources`   | any auth     | Add a resource to the incident           |
| `PATCH /resources/:id/dispatch`   | any auth     | Assign a resource to a user (DISPATCHED) |

`GET /incidents/map` returns each active incident as a GeoJSON `Point` feature
(`coordinates: [lng, lat]`) with properties `id`, `title`, `status`,
`open_task_count`, `high_priority_task_count`, `available_resource_count` — ready
to drop into a Mapbox or Leaflet map. Mapping/geocoding is done client-side; set
`NEXT_PUBLIC_MAPBOX_TOKEN` in your env (the server does no geocoding).

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
