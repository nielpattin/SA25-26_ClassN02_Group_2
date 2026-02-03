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
  dateFrom: t.Optional(t.String()),
  dateTo: t.Optional(t.String()),
  limit: t.Optional(t.String()),
  offset: t.Optional(t.String())
})
