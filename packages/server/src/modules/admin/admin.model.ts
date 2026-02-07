import { t } from 'elysia'

export const AdminRoleSchema = t.Enum({
  super_admin: 'super_admin',
  moderator: 'moderator',
  support: 'support'
})

export type AdminRole = 'super_admin' | 'moderator' | 'support'

export const PromoteUserSchema = t.Object({
  role: AdminRoleSchema
})

export const AuditLogQuerySchema = t.Object({
  adminId: t.Optional(t.String()),
  action: t.Optional(t.String()),
  targetType: t.Optional(t.String()),
  targetId: t.Optional(t.String()),
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  offset: t.Optional(t.String())
})

// Dashboard metrics response
export const DashboardMetricsSchema = t.Object({
  activeUsers24h: t.Integer(),
  pendingModerationCount: t.Integer(),
  recentAdminActions: t.Array(t.Object({
    action: t.String(),
    createdAt: t.String()
  }))
})

// User search response
export const UserSearchResultSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  adminRole: t.Union([t.String(), t.Null()]),
  deletedAt: t.Union([t.String(), t.Null()]),
  lastActive: t.Union([t.String(), t.Null()])
})

export const UserSearchResponseSchema = t.Array(UserSearchResultSchema)

// User detail response
export const UserDetailSchema = t.Object({
  id: t.String(),
  name: t.String(),
  email: t.String(),
  createdAt: t.String(),
  emailVerified: t.Boolean(),
  deletedAt: t.Union([t.String(), t.Null()]),
  adminRole: t.Union([t.String(), t.Null()]),
  workspacesCount: t.Integer(),
  boardsCount: t.Integer(),
  lastActive: t.Union([t.String(), t.Null()])
})
