import { Elysia, t } from 'elysia'
import { adminPlugin } from './admin.plugin'
import { adminService } from './admin.service'
import { PromoteUserSchema, AuditLogQuerySchema } from './admin.model'

export const adminController = new Elysia({ prefix: '/admin' })
  .use(adminPlugin)
  .get('/users', async ({ requireAdmin, query }) => {
    requireAdmin()
    const limit = query.limit ? parseInt(query.limit) : 50
    const offset = query.offset ? parseInt(query.offset) : 0
    
    return await adminService.listAdmins({ limit, offset })
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String())
    })
  })
  .post('/users/:id/promote', async ({ requireRole, params, body, session }) => {
    requireRole(['super_admin'])
    return await adminService.promoteUser(session!.user.id, params.id, body.role)
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: PromoteUserSchema
  })
  .delete('/users/:id/demote', async ({ requireRole, params, session }) => {
    requireRole(['super_admin'])
    return await adminService.demoteUser(session!.user.id, params.id)
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .get('/audit', async ({ requireAdmin, query, session }) => {
    requireAdmin()
    const limit = query.limit ? parseInt(query.limit) : 50
    const offset = query.offset ? parseInt(query.offset) : 0

    return await adminService.getAuditLogs(
      session!.user.id,
      session!.user.adminRole as any,
      {
        ...query,
        limit,
        offset
      }
    )
  }, {
    query: AuditLogQuerySchema
  })
  .get('/audit/export', async ({ requireRole, session }) => {
    requireRole(['super_admin'])
    return await adminService.exportAuditLogs(
      session!.user.id,
      session!.user.adminRole as any
    )
  })
