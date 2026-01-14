# Kyte

Kanban board application.

## Features

- **Kanban Boards**: Drag-and-drop task management.
- **Real-time**: Instant updates via WebSockets.
- **Details**: Markdown, checklists, labels, due dates.
- **Management**: Workspaces, organizations, permissions.
- **Type-Safety**: End-to-end via Eden Treaty.
- **Auth**: Better Auth.

## Tech Stack

- **Runtime**: Bun
- **Backend**: ElysiaJS, Drizzle ORM, PostgreSQL
- **Frontend**: React 19, Vite, TanStack Router/Query, Tailwind CSS

## Structure

- `packages/server`: Backend API
- `packages/web`: Frontend application
- `Design`: Documentation

## Setup

```bash
bun install
docker compose up -d
bun run db:push
```

## Run

```bash
bun run dev
```

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
