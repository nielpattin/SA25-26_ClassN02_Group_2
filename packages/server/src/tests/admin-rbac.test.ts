import { describe, it, expect, beforeAll } from 'bun:test'
import { app } from '../index'
import { db } from '../db'
import { users, adminAuditLog } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { ensureTestUser } from './helpers'

describe('Admin RBAC API', () => {
  const superAdminId = 'super-admin-id'
  const moderatorId = 'moderator-id'
  const regularUserId = 'regular-user-id'

  beforeAll(async () => {
    await ensureTestUser(superAdminId)
    await ensureTestUser(moderatorId)
    await ensureTestUser(regularUserId)

    await db.update(users).set({ adminRole: 'super_admin' }).where(eq(users.id, superAdminId))
    await db.update(users).set({ adminRole: 'moderator' }).where(eq(users.id, moderatorId))
    await db.update(users).set({ adminRole: null }).where(eq(users.id, regularUserId))
  })

  describe('GET /v1/admin/users', () => {
    it('should return 401 if no session', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users'))
      expect(res.status).toBe(401)
    })

    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users', {
        headers: { 'x-test-user-id': regularUserId }
      }))
      expect(res.status).toBe(403)
    })

    it('should return list if admin (moderator)', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users', {
        headers: { 
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.some((u: any) => u.id === superAdminId)).toBe(true)
    })
  })

  describe('POST /v1/admin/users/:id/promote', () => {
    it('should return 403 if moderator tries to promote', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${regularUserId}/promote`, {
        method: 'POST',
        headers: { 
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'support' })
      }))
      expect(res.status).toBe(403)
    })

    it('should promote user and log audit if super_admin', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${regularUserId}/promote`, {
        method: 'POST',
        headers: { 
          'x-test-user-id': superAdminId,
          'x-test-admin-role': 'super_admin',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'support' })
      }))
      expect(res.status).toBe(200)
      
      const [user] = await db.select().from(users).where(eq(users.id, regularUserId))
      expect(user.adminRole).toBe('support')

      const logs = await db.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, regularUserId))
      expect(logs.length).toBeGreaterThan(0)
      const log = logs[0]
      expect(log.action).toBe('user.promoted')
      expect(log.adminId).toBe(superAdminId)
    })
  })

  describe('DELETE /v1/admin/users/:id/demote', () => {
    it('should return 403 if moderator tries to demote', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdminId}/demote`, {
        method: 'DELETE',
        headers: { 
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return 400 if trying to demote the last super admin', async () => {
      // First, demote any other super admins to ensure only one remains
      await db.update(users)
        .set({ adminRole: null })
        .where(and(
          eq(users.adminRole, 'super_admin'),
          sql`${users.id} != ${superAdminId}`
        ))

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdminId}/demote`, {
        method: 'DELETE',
        headers: { 
          'x-test-user-id': superAdminId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error.message).toBe('Cannot demote the last super admin')
    })

    it('should demote user if super_admin', async () => {
      // Create another super admin first
      const anotherSuperAdminId = 'another-super-admin-id'
      await ensureTestUser(anotherSuperAdminId)
      await db.update(users).set({ adminRole: 'super_admin' }).where(eq(users.id, anotherSuperAdminId))

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${anotherSuperAdminId}/demote`, {
        method: 'DELETE',
        headers: { 
          'x-test-user-id': superAdminId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(200)
      
      const [user] = await db.select().from(users).where(eq(users.id, anotherSuperAdminId))
      expect(user.adminRole).toBeNull()
    })
  })

  describe('GET /v1/admin/audit', () => {
    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/audit', {
        headers: { 'x-test-user-id': regularUserId }
      }))
      expect(res.status).toBe(403)
    })

    it('should return only own actions if moderator', async () => {
      // Create some actions
      await db.insert(adminAuditLog).values([
        { adminId: moderatorId, action: 'test.action.1', targetType: 'test' },
        { adminId: superAdminId, action: 'test.action.2', targetType: 'test' }
      ])

      const res = await app.handle(new Request('http://localhost/v1/admin/audit', {
        headers: { 
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.every((l: any) => l.adminId === moderatorId)).toBe(true)
      expect(data.some((l: any) => l.action === 'test.action.1')).toBe(true)
    })

    it('should return all actions if super_admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/audit', {
        headers: { 
          'x-test-user-id': superAdminId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.some((l: any) => l.adminId === moderatorId)).toBe(true)
      expect(data.some((l: any) => l.adminId === superAdminId)).toBe(true)
    })
  })

  describe('GET /v1/admin/audit/export', () => {
    it('should return 403 if moderator', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/audit/export', {
        headers: { 
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return all logs if super_admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/audit/export', {
        headers: { 
          'x-test-user-id': superAdminId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('GET /v1/admin/dashboard', () => {
    it('should return 401 if no session', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/dashboard'))
      expect(res.status).toBe(401)
    })

    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/dashboard', {
        headers: { 'x-test-user-id': regularUserId }
      }))
      expect(res.status).toBe(403)
    })

    it('should return dashboard metrics as admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/dashboard', {
        headers: { 
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      
      // Verify response structure
      expect(typeof data.activeUsers24h).toBe('number')
      expect(typeof data.pendingModerationCount).toBe('number')
      expect(Array.isArray(data.recentAdminActions)).toBe(true)
      
      // Verify recentAdminActions structure if any exist
      if (data.recentAdminActions.length > 0) {
        const action = data.recentAdminActions[0]
        expect(typeof action.action).toBe('string')
        expect(typeof action.createdAt).toBe('string')
      }
    })
  })

  describe('GET /v1/admin/users/search', () => {
    const supportId = 'support-user-id'
    const searchTestUserId = 'search-test-user-id'

    beforeAll(async () => {
      await ensureTestUser(supportId)
      await ensureTestUser(searchTestUserId)
      await db.update(users).set({ adminRole: 'support' }).where(eq(users.id, supportId))
    })

    it('should return 403 if moderator tries to search', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/search?query=test', {
        headers: { 
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/search?query=test', {
        headers: { 'x-test-user-id': regularUserId }
      }))
      expect(res.status).toBe(403)
    })

    it('should search by email as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/search?query=${searchTestUserId}@example.com`, {
        headers: { 
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].email).toContain(searchTestUserId)
      expect(typeof data[0].name).toBe('string')
      // adminRole can be null or string
      expect(data[0].hasOwnProperty('adminRole')).toBe(true)
      expect(data[0].hasOwnProperty('deletedAt')).toBe(true)
      expect(data[0].hasOwnProperty('lastActive')).toBe(true)
    })

    it('should search by name as super_admin', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/search?query=Test`, {
        headers: { 
          'x-test-user-id': superAdminId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should search by id as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/search?query=${searchTestUserId}`, {
        headers: { 
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.some((u: any) => u.id === searchTestUserId)).toBe(true)
    })

    it('should respect pagination', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/search?query=test&limit=5&offset=0', {
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('GET /v1/admin/users/:id', () => {
    const supportId = 'support-user-id-2'
    const detailTestUserId = 'detail-test-user-id'

    beforeAll(async () => {
      await ensureTestUser(supportId)
      await ensureTestUser(detailTestUserId)
      await db.update(users).set({ adminRole: 'support' }).where(eq(users.id, supportId))
    })

    it('should return 403 if moderator tries to access user detail', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${detailTestUserId}`, {
        headers: {
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${detailTestUserId}`, {
        headers: { 'x-test-user-id': regularUserId }
      }))
      expect(res.status).toBe(403)
    })

    it('should return user detail as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${detailTestUserId}`, {
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()

      // Verify response structure
      expect(data.id).toBe(detailTestUserId)
      expect(typeof data.name).toBe('string')
      expect(typeof data.email).toBe('string')
      expect(typeof data.createdAt).toBe('string')
      expect(typeof data.emailVerified).toBe('boolean')
      expect(data.hasOwnProperty('deletedAt')).toBe(true)
      expect(typeof data.workspacesCount).toBe('number')
      expect(typeof data.boardsCount).toBe('number')
      expect(data.hasOwnProperty('lastActive')).toBe(true)
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id', {
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(404)
    })

    it('should return user detail as super_admin', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${detailTestUserId}`, {
        headers: {
          'x-test-user-id': superAdminId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe(detailTestUserId)
    })
  })

  describe('POST /v1/admin/users/:id/password-reset', () => {
    const supportId = 'support-user-id-3'
    const passwordResetTestUserId = 'password-reset-test-user-id'

    beforeAll(async () => {
      await ensureTestUser(supportId)
      await ensureTestUser(passwordResetTestUserId)
      await db.update(users).set({ adminRole: 'support' }).where(eq(users.id, supportId))
    })

    it('should return 403 if moderator tries to reset password', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${passwordResetTestUserId}/password-reset`, {
        method: 'POST',
        headers: {
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if trying to reset admin user password', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdminId}/password-reset`, {
        method: 'POST',
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should reset password for non-admin user as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${passwordResetTestUserId}/password-reset`, {
        method: 'POST',
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify audit log entry
      const logs = await db.select().from(adminAuditLog).where(
        and(
          eq(adminAuditLog.targetId, passwordResetTestUserId),
          eq(adminAuditLog.action, 'user.password_reset')
        )
      )
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].adminId).toBe(supportId)
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id/password-reset', {
        method: 'POST',
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(404)
    })
  })

  describe('POST /v1/admin/users/:id/revoke-sessions', () => {
    const supportId = 'support-user-id-4'
    const revokeSessionsTestUserId = 'revoke-sessions-test-user-id'

    beforeAll(async () => {
      await ensureTestUser(supportId)
      await ensureTestUser(revokeSessionsTestUserId)
      await db.update(users).set({ adminRole: 'support' }).where(eq(users.id, supportId))
    })

    it('should return 403 if moderator tries to revoke sessions', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${revokeSessionsTestUserId}/revoke-sessions`, {
        method: 'POST',
        headers: {
          'x-test-user-id': moderatorId,
          'x-test-admin-role': 'moderator'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if trying to revoke admin user sessions', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdminId}/revoke-sessions`, {
        method: 'POST',
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should revoke sessions for non-admin user as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${revokeSessionsTestUserId}/revoke-sessions`, {
        method: 'POST',
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(typeof data.count).toBe('number')

      // Verify audit log entry
      const logs = await db.select().from(adminAuditLog).where(
        and(
          eq(adminAuditLog.targetId, revokeSessionsTestUserId),
          eq(adminAuditLog.action, 'user.sessions_revoked')
        )
      )
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].adminId).toBe(supportId)
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id/revoke-sessions', {
        method: 'POST',
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(404)
    })
  })

  describe('POST /v1/admin/users/:id/cancel-deletion', () => {
    const superAdminOnlyId = 'super-admin-only-id'
    const cancelDeletionTestUserId = 'cancel-deletion-test-user-id'

    beforeAll(async () => {
      await ensureTestUser(superAdminOnlyId)
      await ensureTestUser(cancelDeletionTestUserId)
      await db.update(users).set({ adminRole: 'super_admin' }).where(eq(users.id, superAdminOnlyId))
    })

    it('should return 403 if support tries to cancel deletion', async () => {
      const supportId = 'support-cancel-deletion-id'
      await ensureTestUser(supportId)
      await db.update(users).set({ adminRole: 'support' }).where(eq(users.id, supportId))

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${cancelDeletionTestUserId}/cancel-deletion`, {
        method: 'POST',
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if trying to cancel deletion for admin user', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdminId}/cancel-deletion`, {
        method: 'POST',
        headers: {
          'x-test-user-id': superAdminOnlyId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return 400 if user is not marked for deletion', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${cancelDeletionTestUserId}/cancel-deletion`, {
        method: 'POST',
        headers: {
          'x-test-user-id': superAdminOnlyId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(400)
    })

    it('should cancel deletion for non-admin user as super_admin', async () => {
      // First mark user for deletion
      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, cancelDeletionTestUserId))

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${cancelDeletionTestUserId}/cancel-deletion`, {
        method: 'POST',
        headers: {
          'x-test-user-id': superAdminOnlyId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      // Verify user is no longer marked for deletion
      const [user] = await db.select().from(users).where(eq(users.id, cancelDeletionTestUserId))
      expect(user.deletedAt).toBeNull()

      // Verify audit log entry
      const logs = await db.select().from(adminAuditLog).where(
        and(
          eq(adminAuditLog.targetId, cancelDeletionTestUserId),
          eq(adminAuditLog.action, 'user.deletion_canceled')
        )
      )
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].adminId).toBe(superAdminOnlyId)
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id/cancel-deletion', {
        method: 'POST',
        headers: {
          'x-test-user-id': superAdminOnlyId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(404)
    })
  })

  describe('POST /v1/admin/users/:id/export', () => {
    const superAdminExportId = 'super-admin-export-id'
    const exportTestUserId = 'export-test-user-id'

    beforeAll(async () => {
      await ensureTestUser(superAdminExportId)
      await ensureTestUser(exportTestUserId)
      await db.update(users).set({ adminRole: 'super_admin' }).where(eq(users.id, superAdminExportId))
    })

    it('should return 403 if support tries to export user data', async () => {
      const supportId = 'support-export-id'
      await ensureTestUser(supportId)
      await db.update(users).set({ adminRole: 'support' }).where(eq(users.id, supportId))

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${exportTestUserId}/export`, {
        method: 'POST',
        headers: {
          'x-test-user-id': supportId,
          'x-test-admin-role': 'support'
        }
      }))
      expect(res.status).toBe(403)
    })

    it('should return user export data as super_admin', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${exportTestUserId}/export`, {
        method: 'POST',
        headers: {
          'x-test-user-id': superAdminExportId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.export).toBeDefined()
      expect(data.export.user).toBeDefined()
      expect(data.export.user.id).toBe(exportTestUserId)
      expect(Array.isArray(data.export.workspaces)).toBe(true)
      expect(Array.isArray(data.export.ownedBoards)).toBe(true)
      expect(Array.isArray(data.export.memberBoards)).toBe(true)
      expect(typeof data.export.taskCount).toBe('number')

      // Verify audit log entry
      const logs = await db.select().from(adminAuditLog).where(
        and(
          eq(adminAuditLog.targetId, exportTestUserId),
          eq(adminAuditLog.action, 'user.exported')
        )
      )
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].adminId).toBe(superAdminExportId)
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id/export', {
        method: 'POST',
        headers: {
          'x-test-user-id': superAdminExportId,
          'x-test-admin-role': 'super_admin'
        }
      }))
      expect(res.status).toBe(404)
    })
  })
})
