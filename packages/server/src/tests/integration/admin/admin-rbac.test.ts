import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  cleanupTestUser,
  type TestUser
} from '../../test-helpers'
import { db } from '../../../db'
import { users, adminAuditLog } from '../../../db/schema'
import { eq, and, sql } from 'drizzle-orm'

describe('Admin RBAC API', () => {
  let superAdmin: TestUser
  let moderator: TestUser
  let regularUser: TestUser
  let targetUser: TestUser

  const app = getTestApp()

  beforeAll(async () => {
    superAdmin = await createTestUser({ adminRole: 'super_admin' })
    moderator = await createTestUser({ adminRole: 'moderator' })
    regularUser = await createTestUser()
    targetUser = await createTestUser()
  })

  afterAll(async () => {
    await cleanupTestUser(superAdmin.id)
    await cleanupTestUser(moderator.id)
    await cleanupTestUser(regularUser.id)
    await cleanupTestUser(targetUser.id)
  })

  describe('GET /v1/admin/users', () => {
    it('should return 401 if no session', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users'))
      expect(res.status).toBe(401)
    })

    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users', {
        headers: getAuthHeaders(regularUser)
      }))
      expect(res.status).toBe(403)
    })

    it('should return list if admin (moderator)', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users', {
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.some((u: { id: string }) => u.id === superAdmin.id)).toBe(true)
    })
  })

  describe('POST /v1/admin/users/:id/promote', () => {
    it('should return 403 if moderator tries to promote', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${targetUser.id}/promote`, {
        method: 'POST',
        headers: getAuthHeaders(moderator),
        body: JSON.stringify({ role: 'support' })
      }))
      expect(res.status).toBe(403)
    })

    it('should promote user and log audit if super_admin', async () => {
      const promoteTarget = await createTestUser()
      
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${promoteTarget.id}/promote`, {
        method: 'POST',
        headers: getAuthHeaders(superAdmin),
        body: JSON.stringify({ role: 'support' })
      }))
      expect(res.status).toBe(200)
      
      const [user] = await db.select().from(users).where(eq(users.id, promoteTarget.id))
      expect(user.adminRole).toBe('support')

      const logs = await db.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, promoteTarget.id))
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].action).toBe('user.promoted')
      expect(logs[0].adminId).toBe(superAdmin.id)

      await cleanupTestUser(promoteTarget.id)
    })
  })

  describe('DELETE /v1/admin/users/:id/demote', () => {
    it('should return 403 if moderator tries to demote', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdmin.id}/demote`, {
        method: 'DELETE',
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(403)
    })

    it('should demote user if super_admin', async () => {
      const demoteTarget = await createTestUser({ adminRole: 'super_admin' })

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${demoteTarget.id}/demote`, {
        method: 'DELETE',
        headers: getAuthHeaders(superAdmin)
      }))
      expect(res.status).toBe(200)
      
      const [user] = await db.select().from(users).where(eq(users.id, demoteTarget.id))
      expect(user.adminRole).toBeNull()

      await cleanupTestUser(demoteTarget.id)
    })
  })

  describe('GET /v1/admin/audit', () => {
    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/audit', {
        headers: getAuthHeaders(regularUser)
      }))
      expect(res.status).toBe(403)
    })

    it('should return only own actions if moderator', async () => {
      await db.insert(adminAuditLog).values([
        { adminId: moderator.id, action: 'test.mod.action', targetType: 'test' },
        { adminId: superAdmin.id, action: 'test.super.action', targetType: 'test' }
      ]).onConflictDoNothing()

      const res = await app.handle(new Request('http://localhost/v1/admin/audit', {
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.every((l: { adminId: string }) => l.adminId === moderator.id)).toBe(true)
    })

    it('should return all actions if super_admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/audit', {
        headers: getAuthHeaders(superAdmin)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
    })
  })

  describe('GET /v1/admin/audit/export', () => {
    it('should return 403 if moderator', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/audit/export', {
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(403)
    })

    it('should return all logs if super_admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/audit/export', {
        headers: getAuthHeaders(superAdmin)
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
        headers: getAuthHeaders(regularUser)
      }))
      expect(res.status).toBe(403)
    })

    it('should return dashboard metrics as admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/dashboard', {
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      
      expect(typeof data.activeUsers24h).toBe('number')
      expect(typeof data.pendingModerationCount).toBe('number')
      expect(Array.isArray(data.recentAdminActions)).toBe(true)
    })
  })

  describe('GET /v1/admin/users/search', () => {
    let supportUser: TestUser
    let searchTarget: TestUser

    beforeAll(async () => {
      supportUser = await createTestUser({ adminRole: 'support' })
      searchTarget = await createTestUser()
    })

    afterAll(async () => {
      await cleanupTestUser(supportUser.id)
      await cleanupTestUser(searchTarget.id)
    })

    it('should return 403 if moderator tries to search', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/search?query=test', {
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/search?query=test', {
        headers: getAuthHeaders(regularUser)
      }))
      expect(res.status).toBe(403)
    })

    it('should search by email as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/search?query=${searchTarget.email}`, {
        headers: getAuthHeaders(supportUser)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0].email).toContain(searchTarget.email.split('@')[0])
    })

    it('should search by name as super_admin', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/search?query=Test', {
        headers: getAuthHeaders(superAdmin)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should respect pagination', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/search?query=test&limit=5&offset=0', {
        headers: getAuthHeaders(supportUser)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeLessThanOrEqual(5)
    })
  })

  describe('GET /v1/admin/users/:id', () => {
    let supportUser2: TestUser
    let detailTarget: TestUser

    beforeAll(async () => {
      supportUser2 = await createTestUser({ adminRole: 'support' })
      detailTarget = await createTestUser()
    })

    afterAll(async () => {
      await cleanupTestUser(supportUser2.id)
      await cleanupTestUser(detailTarget.id)
    })

    it('should return 403 if moderator tries to access user detail', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${detailTarget.id}`, {
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if not admin', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${detailTarget.id}`, {
        headers: getAuthHeaders(regularUser)
      }))
      expect(res.status).toBe(403)
    })

    it('should return user detail as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${detailTarget.id}`, {
        headers: getAuthHeaders(supportUser2)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.id).toBe(detailTarget.id)
      expect(typeof data.name).toBe('string')
      expect(typeof data.email).toBe('string')
      expect(typeof data.createdAt).toBe('string')
      expect(typeof data.emailVerified).toBe('boolean')
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id', {
        headers: getAuthHeaders(supportUser2)
      }))
      expect(res.status).toBe(404)
    })

    it('should return user detail as super_admin', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${detailTarget.id}`, {
        headers: getAuthHeaders(superAdmin)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.id).toBe(detailTarget.id)
    })
  })

  describe('POST /v1/admin/users/:id/password-reset', () => {
    let supportUser3: TestUser
    let resetTarget: TestUser

    beforeAll(async () => {
      supportUser3 = await createTestUser({ adminRole: 'support' })
      resetTarget = await createTestUser()
    })

    afterAll(async () => {
      await cleanupTestUser(supportUser3.id)
      await cleanupTestUser(resetTarget.id)
    })

    it('should return 403 if moderator tries to reset password', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${resetTarget.id}/password-reset`, {
        method: 'POST',
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if trying to reset admin user password', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdmin.id}/password-reset`, {
        method: 'POST',
        headers: getAuthHeaders(supportUser3)
      }))
      expect(res.status).toBe(403)
    })

    it('should reset password for non-admin user as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${resetTarget.id}/password-reset`, {
        method: 'POST',
        headers: getAuthHeaders(supportUser3)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      const logs = await db.select().from(adminAuditLog).where(
        and(
          eq(adminAuditLog.targetId, resetTarget.id),
          eq(adminAuditLog.action, 'user.password_reset')
        )
      )
      expect(logs.length).toBeGreaterThan(0)
      expect(logs[0].adminId).toBe(supportUser3.id)
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id/password-reset', {
        method: 'POST',
        headers: getAuthHeaders(supportUser3)
      }))
      expect(res.status).toBe(404)
    })
  })

  describe('POST /v1/admin/users/:id/revoke-sessions', () => {
    let supportUser4: TestUser
    let revokeTarget: TestUser

    beforeAll(async () => {
      supportUser4 = await createTestUser({ adminRole: 'support' })
      revokeTarget = await createTestUser()
    })

    afterAll(async () => {
      await cleanupTestUser(supportUser4.id)
      await cleanupTestUser(revokeTarget.id)
    })

    it('should return 403 if moderator tries to revoke sessions', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${revokeTarget.id}/revoke-sessions`, {
        method: 'POST',
        headers: getAuthHeaders(moderator)
      }))
      expect(res.status).toBe(403)
    })

    it('should return 403 if trying to revoke admin user sessions', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdmin.id}/revoke-sessions`, {
        method: 'POST',
        headers: getAuthHeaders(supportUser4)
      }))
      expect(res.status).toBe(403)
    })

    it('should revoke sessions for non-admin user as support', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${revokeTarget.id}/revoke-sessions`, {
        method: 'POST',
        headers: getAuthHeaders(supportUser4)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(typeof data.count).toBe('number')
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id/revoke-sessions', {
        method: 'POST',
        headers: getAuthHeaders(supportUser4)
      }))
      expect(res.status).toBe(404)
    })
  })

  describe('POST /v1/admin/users/:id/cancel-deletion', () => {
    let superAdmin2: TestUser
    let cancelTarget: TestUser

    beforeAll(async () => {
      superAdmin2 = await createTestUser({ adminRole: 'super_admin' })
      cancelTarget = await createTestUser()
    })

    afterAll(async () => {
      await cleanupTestUser(superAdmin2.id)
      await cleanupTestUser(cancelTarget.id)
    })

    it('should return 403 if support tries to cancel deletion', async () => {
      const supportCancel = await createTestUser({ adminRole: 'support' })

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${cancelTarget.id}/cancel-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(supportCancel)
      }))
      expect(res.status).toBe(403)

      await cleanupTestUser(supportCancel.id)
    })

    it('should return 403 if trying to cancel deletion for admin user', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${superAdmin.id}/cancel-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(superAdmin2)
      }))
      expect(res.status).toBe(403)
    })

    it('should return 400 if user is not marked for deletion', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${cancelTarget.id}/cancel-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(superAdmin2)
      }))
      expect(res.status).toBe(400)
    })

    it('should cancel deletion for non-admin user as super_admin', async () => {
      await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, cancelTarget.id))

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${cancelTarget.id}/cancel-deletion`, {
        method: 'POST',
        headers: getAuthHeaders(superAdmin2)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)

      const [user] = await db.select().from(users).where(eq(users.id, cancelTarget.id))
      expect(user.deletedAt).toBeNull()
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id/cancel-deletion', {
        method: 'POST',
        headers: getAuthHeaders(superAdmin2)
      }))
      expect(res.status).toBe(404)
    })
  })

  describe('POST /v1/admin/users/:id/export', () => {
    let superAdmin3: TestUser
    let exportTarget: TestUser

    beforeAll(async () => {
      superAdmin3 = await createTestUser({ adminRole: 'super_admin' })
      exportTarget = await createTestUser()
    })

    afterAll(async () => {
      await cleanupTestUser(superAdmin3.id)
      await cleanupTestUser(exportTarget.id)
    })

    it('should return 403 if support tries to export user data', async () => {
      const supportExport = await createTestUser({ adminRole: 'support' })

      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${exportTarget.id}/export`, {
        method: 'POST',
        headers: getAuthHeaders(supportExport)
      }))
      expect(res.status).toBe(403)

      await cleanupTestUser(supportExport.id)
    })

    it('should return user export data as super_admin', async () => {
      const res = await app.handle(new Request(`http://localhost/v1/admin/users/${exportTarget.id}/export`, {
        method: 'POST',
        headers: getAuthHeaders(superAdmin3)
      }))
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.export).toBeDefined()
      expect(data.export.user).toBeDefined()
      expect(data.export.user.id).toBe(exportTarget.id)
      expect(Array.isArray(data.export.workspaces)).toBe(true)
      expect(Array.isArray(data.export.ownedBoards)).toBe(true)
      expect(Array.isArray(data.export.memberBoards)).toBe(true)
      expect(typeof data.export.taskCount).toBe('number')
    })

    it('should return 404 if user not found', async () => {
      const res = await app.handle(new Request('http://localhost/v1/admin/users/non-existent-user-id/export', {
        method: 'POST',
        headers: getAuthHeaders(superAdmin3)
      }))
      expect(res.status).toBe(404)
    })
  })
})
