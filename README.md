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

## Workspace scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Run all workspaces in dev mode       |
| `npm run build`      | Build all workspaces                 |
| `npm run lint`       | Lint/type-check all workspaces       |
