# Kyte

Kanban board application.

## Features

- **Kanban Boards**: Drag-and-drop task management.
- **Real-time**: Instant updates via WebSockets.
- **Details**: Markdown, checklists, labels, due dates.
- **File Attachments**: Upload files with drag-and-drop (SeaweedFS storage).
- **Management**: Workspaces, teams, permissions.
- **Type-Safety**: End-to-end via Eden Treaty.
- **Auth**: Better Auth.

## Tech Stack

- **Runtime**: Bun
- **Backend**: ElysiaJS, Drizzle ORM, PostgreSQL
- **Frontend**: React 19, Vite, TanStack Router/Query, Tailwind CSS
- **Storage**: SeaweedFS (S3-compatible object storage)

## Structure

- `packages/server`: Backend API
- `packages/web`: Frontend application
- `Design`: Documentation

## Setup

```bash
# Install dependencies
bun install

# Start Docker services (PostgreSQL + SeaweedFS)
docker compose up -d

# Copy environment file and configure
cp .env.example packages/server/.env

# Create the S3 bucket for file uploads
curl -X PUT http://localhost:8333/kyte

# Push database schema
cd packages/server && bun run db:push
```

## Run

```bash
bun run dev
```

## Services

| Service    | URL                   | Description              |
| :--------- | :-------------------- | :----------------------- |
| Web App    | http://localhost:5173 | Frontend application     |
| API Server | http://localhost:3000 | Backend API              |
| Filer UI   | http://localhost:8888 | SeaweedFS file browser   |
| S3 API     | http://localhost:8333 | SeaweedFS S3-compatible  |
| PostgreSQL | localhost:5432        | Database                 |

## Commands

| Command | Description |
| :--- | :--- |
| `bun install` | Install dependencies |
| `bun run dev` | Start development servers |
| `bun run db:push` | Push schema to DB (Dev) |
| `bun run db:generate` | Generate migrations |
| `bun run --filter @kyte/web lint` | Lint web package |
| `cd packages/server && bun test` | Run server tests |
| `cd packages/server && bun tsc --noEmit` | Typecheck server |
