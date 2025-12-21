# Kyte Architecture

**Pattern**: Modular Monolith

## Overview

Kyte uses a Modular Monolith architecture - each module is a self-contained bounded context that can evolve independently. Modules communicate through well-defined interfaces, making future extraction to microservices possible.

## Backend Structure (ElysiaJS)

```
server/src/
├── modules/
│   ├── boards/
│   │   ├── boards.controller.ts   # Elysia routes (HTTP)
│   │   ├── boards.service.ts      # Business logic
│   │   ├── boards.repository.ts   # Database queries
│   │   ├── boards.model.ts        # Elysia.t schemas (validation + types)
│   │   └── index.ts               # Public exports
│   ├── columns/
│   │   ├── columns.controller.ts
│   │   ├── columns.service.ts
│   │   ├── columns.repository.ts
│   │   └── index.ts
│   ├── cards/
│   │   ├── cards.controller.ts
│   │   ├── cards.service.ts
│   │   ├── cards.repository.ts
│   │   ├── cards.model.ts
│   │   ├── cards.events.ts        # WebSocket event handlers
│   │   └── index.ts
│   └── auth/                      # Future: Better Auth integration
│       ├── auth.controller.ts
│       ├── auth.service.ts
│       └── index.ts
├── shared/
│   ├── middleware/
│   │   └── error-handler.ts       # Global error handling
│   └── utils/                     # Generic helpers
├── db/
│   ├── schema.ts                  # Drizzle schema definitions
│   └── client.ts                  # Database connection
├── websocket/
│   └── manager.ts                 # Broadcast utility
└── index.ts                       # App entry point
```

### Layer Responsibilities

| Layer          | File                  | Responsibility                          |
| -------------- | --------------------- | --------------------------------------- |
| **Controller** | `*.controller.ts`     | HTTP routing, request validation        |
| **Service**    | `*.service.ts`        | Business logic, orchestration           |
| **Repository** | `*.repository.ts`     | Database queries (Drizzle)              |
| **Model**      | `*.model.ts`          | Elysia.t schemas (single source of truth) |
| **Events**     | `*.events.ts`         | WebSocket event handlers                |

### Dependency Flow (Strict Downward)

```
Controller → Service → Repository → DB
     ↓
   Model (shared validation schema)
```

- Controller can call Service
- Service can call Repository
- Repository can call DB
- **Never upward** - Repository never calls Service, Service never calls Controller

## Frontend Structure (React)

```
web/src/
├── components/
│   ├── boards/
│   │   ├── BoardCard.tsx
│   │   ├── BoardList.tsx
│   │   └── CreateBoardModal.tsx
│   ├── columns/
│   │   ├── Column.tsx
│   │   └── ColumnHeader.tsx
│   ├── cards/
│   │   ├── Card.tsx
│   │   ├── CardModal.tsx
│   │   └── CardForm.tsx
│   └── ui/                        # Shared primitives
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── hooks/
│   ├── useBoards.ts
│   ├── useColumns.ts
│   ├── useCards.ts
│   └── useCardSocket.ts          # WebSocket connection
├── api/
│   └── client.ts                 # Eden Treaty client
├── routes/                       # TanStack Router pages
│   ├── __root.tsx
│   ├── index.tsx                 # Landing page
│   ├── dashboard.tsx             # Board list
│   └── board.$boardId.tsx        # Kanban board view
└── main.tsx
```

### Component Organization

- **Domain folders** (`boards/`, `columns/`, `cards/`): Feature-specific components
- **UI folder**: Reusable, domain-agnostic primitives
- **Hooks**: Separated by domain, prefixed with `use`
- **Routes**: TanStack Router file-based routing

## Data Flow

### REST (CRUD Operations)

```
React Component
    ↓
Hook (useCards)
    ↓
Eden Treaty (api/client.ts)
    ↓
Elysia Controller
    ↓
Service → Repository → DB
    ↓
Response back up the chain
```

### WebSocket (Real-time Sync)

```
[Client A] Card moved
    ↓
REST API call
    ↓
cards.service.ts (business logic)
    ↓
cards.events.ts (broadcast event)
    ↓
websocket/manager.ts
    ↓
[All subscribed clients] receive update
    ↓
TanStack Query cache invalidation
    ↓
UI re-renders
```

## Module Communication

Modules interact through their public `index.ts` exports

## Naming Conventions

| Type           | Convention                | Example                  |
| -------------- | ------------------------- | ------------------------ |
| Files          | `{domain}.{layer}.ts`     | `boards.controller.ts`   |
| Components     | PascalCase                | `BoardCard.tsx`          |
| Hooks          | camelCase with `use`      | `useBoards.ts`           |
| DB columns     | snake_case                | `board_id`, `created_at` |
| Routes         | kebab-case                | `board.$boardId.tsx`     |

---

## Key Decisions

| Decision           | Choice                     | Reasoning                              |
| ------------------ | -------------------------- | -------------------------------------- |
| Architecture       | Modular Monolith           | Scalable, not over-engineered          |
| Repository layer   | Yes                        | Abstracts DB, testable services        |
| Entity naming      | Cards (not Tasks)          | Kanban convention                      |
| WebSocket location | `websocket/` + events      | Centralized manager, per-module events |
| Frontend structure | Flat by type               | Simple, familiar React pattern         |
| Type source        | `model.ts` (Elysia.t)      | Single source of truth                 |

## Future Considerations

- **Auth module**: Better Auth integration when needed
- **Microservices**: Each module can be extracted if scale demands
- **Testing**: Services are framework-agnostic, easily unit testable
