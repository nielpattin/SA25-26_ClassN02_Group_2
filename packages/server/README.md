# @kyte/server

Backend API for Kyte. Elysia + Drizzle ORM + PostgreSQL.

## Commands

| Command              | Description                 |
| :------------------- | :-------------------------- |
| `bun run dev`        | Start dev server (port 3000) |
| `bun run db:reset`   | Reset DB + S3 and reseed    |
| `bun run db:push`    | Push schema to DB           |
| `bun run db:generate`| Generate migrations         |
| `bun test`           | Run tests                   |

## Structure

```
src/
├── index.ts       # Entry point
├── db/schema.ts   # Database schema
├── modules/       # Feature modules
└── tests/         # Test files
```
