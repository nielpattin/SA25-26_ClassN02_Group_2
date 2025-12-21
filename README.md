# Kyte

A Kanban board purpose-driven project task management application.

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

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Runtime  | Bun                                 |
| Server   | Elysia, Drizzle ORM, PostgreSQL     |
| Web      | React 19, TanStack Router/Query     |
| API      | Eden Treaty (type-safe)             |
| Realtime | WebSocket                           |