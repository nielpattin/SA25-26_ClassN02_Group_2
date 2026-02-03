import { describe, it, expect, beforeAll } from 'bun:test'
import { app } from '../index'
import { db } from '../db'
import { users, adminAuditLog } from '../db/schema'
import { eq } from 'drizzle-orm'
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
})
