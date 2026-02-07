import { Elysia, t } from 'elysia'
import { adminPlugin } from './admin.plugin'
import { adminService } from './admin.service'
import { PromoteUserSchema, AuditLogQuerySchema, DashboardMetricsSchema, UserSearchResponseSchema, UserDetailSchema, AdminRole } from './admin.model'

export const adminController = new Elysia({ prefix: '/admin' })
  .use(adminPlugin)
  .get('/dashboard', async ({ requireAdmin }) => {
    requireAdmin()
    return await adminService.getDashboardMetrics()
  }, {
    requireAuth: true,
    response: DashboardMetricsSchema,
  })
  .get('/users', async ({ requireAdmin, query }) => {
    requireAdmin()
    const limit = query.limit ? parseInt(query.limit) : 50
    const offset = query.offset ? parseInt(query.offset) : 0
    
    return await adminService.listAdmins({ limit, offset })
  }, {
    requireAuth: true,
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
  })
  .post('/users/:id/promote', async ({ requireRole, params, body, session }) => {
    requireRole(['super_admin'])
    return await adminService.promoteUser(session.user.id, params.id, body.role)
  }, {
    requireAuth: true,
    params: t.Object({
      id: t.String(),
    }),
    body: PromoteUserSchema,
  })
  .delete('/users/:id/demote', async ({ requireRole, params, session }) => {
    requireRole(['super_admin'])
    return await adminService.demoteUser(session.user.id, params.id)
  }, {
    requireAuth: true,
    params: t.Object({
      id: t.String(),
    }),
  })
  .get('/audit', async ({ requireAdmin, query, session }) => {
    requireAdmin()
    const limit = query.limit ? parseInt(query.limit) : 50
    const offset = query.offset ? parseInt(query.offset) : 0

    return await adminService.getAuditLogs(
      session.user.id,
      (session.user.adminRole || 'support') as AdminRole,
      {
        ...query,
        limit,
        offset,
      },
    )
  }, {
    requireAuth: true,
    query: AuditLogQuerySchema,
  })
  .get('/audit/export', async ({ requireRole, session }) => {
    requireRole(['super_admin'])
    return await adminService.exportAuditLogs(
      session.user.id,
      (session.user.adminRole || 'support') as AdminRole,
    )
  }, {
    requireAuth: true,
  })
  .get('/users/search', async ({ requireRole, query }) => {
    requireRole(['super_admin', 'support'])
    const limit = query.limit ? parseInt(query.limit) : 20
    const offset = query.offset ? parseInt(query.offset) : 0

    return await adminService.searchUsers(query.query, { limit, offset })
  }, {
    requireAuth: true,
    query: t.Object({
      query: t.String(),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    }),
    response: UserSearchResponseSchema,
  })
  .get('/users/:id', async ({ requireRole, params }) => {
    requireRole(['super_admin', 'moderator', 'support'])
    return await adminService.getUserDetail(params.id)
  }, {
    requireAuth: true,
    params: t.Object({
      id: t.String(),
    }),
    response: UserDetailSchema,
  })
  .post('/users/:id/password-reset', async ({ requireRole, params, session }) => {
    requireRole(['super_admin', 'support'])
    return await adminService.resetUserPassword(session.user.id, params.id)
  }, {
    requireAuth: true,
    params: t.Object({
      id: t.String(),
    }),
  })
  .post('/users/:id/revoke-sessions', async ({ requireRole, params, session }) => {
    requireRole(['super_admin', 'support'])
    return await adminService.revokeUserSessions(session.user.id, params.id)
  }, {
    requireAuth: true,
    params: t.Object({
      id: t.String(),
    }),
  })
  .post('/users/:id/cancel-deletion', async ({ requireRole, params, session }) => {
    requireRole(['super_admin'])
    return await adminService.cancelUserDeletion(session.user.id, params.id)
  }, {
    requireAuth: true,
    params: t.Object({
      id: t.String(),
    }),
  })
  .post('/users/:id/export', async ({ requireRole, params, session }) => {
    requireRole(['super_admin'])
    return await adminService.exportUserData(session.user.id, params.id)
  }, {
    requireAuth: true,
    params: t.Object({
      id: t.String(),
    }),
  })
