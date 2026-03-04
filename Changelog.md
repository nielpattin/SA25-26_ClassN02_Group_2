# Changelog

## v1.0.50 (2026-02-07)

**Author**: Niel Pattin
- **Admin Dashboard**: Completely redesigned with monochrome brutalist aesthetic.
- **Metrics**: Added 7-day user growth visualization, total platform counts, and system health status.
- **Security**: Hardened service-layer authorization for all administrative actions.
- **Data**: Enhanced seeding system with realistic high-volume demo data (500+ users, 100+ boards).
- **Quality**: Removed AI-generated slop and standardized code style across admin modules.

## v1.0.42 (2026-02-05)

**Author**: Niel Pattin
- **Activities**: Implemented real-time activity feed synchronization via WebSockets.
- **WebSocket**: Added connection heartbeat and automatic reconnection logic.
- **UX**: Added empty state illustrations for boards and workspaces.

## v1.0.35 (2026-02-03)

**Author**: Niel Pattin
- **Search**: Added global fuzzy search for boards and tasks using PostgreSQL TSVector.
- **UI**: Refined board header layout and improved responsiveness for mobile devices.
- **Performance**: Reduced bundle size by 15% through aggressive tree-shaking.

## v1.0.24 (2026-02-01)

**Author**: Niel Pattin
- **Validation**: Hardened input normalization and validation across all service layers.
- **Storage**: Integrated SeaweedFS for scalable object storage and task attachments.
- **Email**: Implemented transactional emails for task mentions and due date reminders.

## v1.0.12 (2026-01-25)

**Author**: Niel Pattin
- **Notifications**: Added real-time in-app notification system with action deep-links.
- **Accessibility**: Conducted WCAG 2.1 AA audit and fixed keyboard navigation in modals.
- **Bug**: Fixed race condition in fractional indexing during rapid drag-and-drop actions.

## v1.0.0 (2026-01-15)

**Author**: Niel Pattin
- **Production Ready**: Stable 1.0 release with complete feature parity for core Kanban workflows.
- **Auth**: Fully integrated Better-Auth with session management and account recovery.
- **Workspace**: Added workspace-level security and permission management.
- **Design**: Standardized the "Hardened Brutalist" design system components.

## v0.9.5 (2026-01-08)

**Author**: Niel Pattin
- **Mobile**: Released mobile-optimized PWA support with offline-first capabilities.
- **Analytics**: Added basic board analytics showing lead time and cycle time.
- **DX**: Added automated API documentation via Elysia Swagger.

## v0.9.0 (2025-12-28)

**Author**: Niel Pattin
- **Templates**: Implemented public board marketplace and template moderation system.
- **Gantt View**: Added interactive timeline with dependency tracking and auto-scaling.
- **Real-time**: Integrated WebSocket bridge for live cursor presence and activity feeds.
- **Performance**: Optimized database indexing for search and fractional indexing for large boards.

## v0.5.0 (2025-12-24)

**Author**: Niel Pattin
- **Collaboration**: Added board member invites and role-based permissions (Admin/Member/Viewer).
- **Checklists**: Implemented multi-checklist support for tasks with progress visualization.
- **UI**: Added dark mode support and theme persistence.

## v0.1.0 (2025-12-21)

**Author**: Niel Pattin
- Initial project setup with Bun monorepo
- Add @kyte/server with Elysia, Drizzle ORM, PostgreSQL
- Add @kyte/web with React 19, TanStack Router/Query
- Implement modular monolith architecture (boards/columns/cards)
- Add WebSocket support for real-time sync
- Add Docker Compose for PostgreSQL
- Add project documentation (README, ARCHITECTURE.md, Changelog.md)
- Can now create boards, columns, and cards with real-time updates across clients
