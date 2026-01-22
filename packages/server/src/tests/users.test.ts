import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser } from './helpers'
import { db } from '../db'
import { sessions, accounts, users } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { auth } from '../modules/auth/auth'

describe('Users & Sessions API', () => {
  let userId: string

  beforeAll(async () => {
    userId = await ensureTestUser()
    
    // Add dummy sessions for testing
    await db.insert(sessions).values([
      {
        id: 'test-session-id', // Matches authPlugin test bypass
        userId: userId,
        token: 'test-token',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      {
        id: 'other-session-1',
        userId: userId,
        token: 'token-1',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
      },
      {
        id: 'other-session-2',
        userId: userId,
        token: 'token-2',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    ]).onConflictDoNothing()
  })

  afterAll(async () => {
    // Cleanup sessions
    await db.delete(sessions).where(eq(sessions.userId, userId))
  })

  test('GET /users/:id/sessions - list sessions', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/users/${userId}/sessions`, {
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(3)

    const current = data.find((s: any) => s.id === 'test-session-id')
    expect(current).toBeDefined()
    expect(current.isCurrent).toBe(true)
    expect(current.browser).toContain('Chrome')
    expect(current.device).toBe('Windows 10')

    const mobile = data.find((s: any) => s.id === 'other-session-1')
    expect(mobile).toBeDefined()
    expect(mobile.isCurrent).toBe(false)
    expect(mobile.browser).toContain('Safari')
    expect(mobile.device).toBe('Apple iPhone')
  })

  test('DELETE /users/:id/sessions/:sessionId - revoke session', async () => {
    // Try to revoke current session (should fail)
    const resFail = await app.handle(
      new Request(`http://localhost/v1/users/${userId}/sessions/test-session-id`, {
        method: 'DELETE',
        headers: getAuthHeaders(userId)
      })
    )
    expect(resFail.status).toBe(400)
    const errorData = await resFail.json()
    expect(errorData.success).toBe(false)
    expect(errorData.error).toBe('Cannot revoke current session')

    // Revoke other session
    const resSuccess = await app.handle(
      new Request(`http://localhost/v1/users/${userId}/sessions/other-session-1`, {
        method: 'DELETE',
        headers: getAuthHeaders(userId)
      })
    )
    expect(resSuccess.status).toBe(200)
    expect(await resSuccess.json()).toEqual({ success: true })

    // Verify it's gone from DB
    const dbSessions = await db.select().from(sessions).where(
      and(eq(sessions.userId, userId), eq(sessions.id, 'other-session-1'))
    )
    expect(dbSessions.length).toBe(0)
  })

  test('POST /users/:id/sessions/revoke-all - revoke all except current', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/users/${userId}/sessions/revoke-all`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.count).toBeGreaterThanOrEqual(1)

    // Verify only current session remains
    const dbSessions = await db.select().from(sessions).where(eq(sessions.userId, userId))
    expect(dbSessions.length).toBe(1)
    expect(dbSessions[0].id).toBe('test-session-id')
  })

  test('GET /users/:id/sessions - unauthorized access', async () => {
    const otherUserId = 'other-user-id'
    const res = await app.handle(
      new Request(`http://localhost/v1/users/${userId}/sessions`, {
        headers: getAuthHeaders(otherUserId)
      })
    )
    expect(res.status).toBe(403)
  })

  test('PATCH /users/:id/notification-preferences - update partially', async () => {
    // 1. Update mention.email
    const res1 = await app.handle(
      new Request(`http://localhost/v1/users/${userId}/notification-preferences`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(userId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mention: { email: false }
        })
      })
    )
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.notificationPreferences.mention.email).toBe(false)
    expect(data1.notificationPreferences.mention.inApp).toBe(true) // Should remain true
    expect(data1.notificationPreferences.comment.email).toBe(true) // Should remain true

    // 2. Update comment.inApp
    const res2 = await app.handle(
      new Request(`http://localhost/v1/users/${userId}/notification-preferences`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(userId),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: { inApp: false }
        })
      })
    )
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.notificationPreferences.comment.inApp).toBe(false)
    expect(data2.notificationPreferences.comment.email).toBe(true) // Should remain true
    expect(data2.notificationPreferences.mention.email).toBe(false) // Should remain false from previous update
  })

  test('DELETE /users/:id - soft delete account', async () => {
    const testPassword = 'Password123!'
    const email = `delete-test-${Date.now()}@example.com`
    
    // Create user via API to ensure correct DB structure
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password: testPassword,
        name: 'Delete Test User',
      }
    })
    
    if (!signUpResult || !('user' in signUpResult)) {
      throw new Error('Failed to sign up test user')
    }
    
    const deleteTestUserId = signUpResult.user.id

    // 1. Wrong password
    const resFail = await app.handle(
      new Request(`http://localhost/v1/users/${deleteTestUserId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(deleteTestUserId),
        body: JSON.stringify({ password: 'wrong-password' })
      })
    )
    expect(resFail.status).toBe(403)

    // 2. Correct password
    const resSuccess = await app.handle(
      new Request(`http://localhost/v1/users/${deleteTestUserId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(deleteTestUserId),
        body: JSON.stringify({ password: testPassword })
      })
    )
    expect(resSuccess.status).toBe(200)
    const data = await resSuccess.json()
    expect(data.message).toContain('Account scheduled for deletion')

    // 3. Verify deletedAt in DB
    const [user] = await db.select().from(users).where(eq(users.id, deleteTestUserId))
    expect(user.deletedAt).not.toBeNull()

    // 4. Verify sessions revoked
    const dbSessions = await db.select().from(sessions).where(eq(sessions.userId, deleteTestUserId))
    expect(dbSessions.length).toBe(0)
  })

  test('Login blocked for soft-deleted users', async () => {
    const testPassword = 'Password123!'
    const email = `login-block-${Date.now()}@example.com`
    
    // 1. Create a user via Better Auth API
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password: testPassword,
        name: 'Deleted User',
      }
    })
    
    if (!signUpResult || !('user' in signUpResult)) {
      throw new Error('Failed to sign up test user')
    }
    
    const deletedUserId = signUpResult.user.id

    // 2. Mark as deleted in DB
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, deletedUserId))

    // 3. Try to sign in via API
    try {
      await auth.api.signInEmail({
        body: {
          email,
          password: testPassword,
        }
      })
      // Should not reach here
      expect(true).toBe(false)
    } catch (error: any) {
      // Better Auth API returns error status as string (e.g. "FORBIDDEN")
      expect(error.status).toBe('FORBIDDEN')
      expect(error.message).toContain('Account is scheduled for deletion')
    }
  })

  test('POST /users/:id/avatar - upload avatar', async () => {
    // Minimal valid JPEG header
    const jpegBytes = new Uint8Array([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
    ])
    const blob = new Blob([jpegBytes], { type: 'image/jpeg' })
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    
    const formData = new FormData()
    formData.append('file', file)

    const headers = getAuthHeaders(userId)
    // @ts-ignore
    delete headers['Content-Type']

    const res = await app.handle(
      new Request(`http://localhost/v1/users/${userId}/avatar`, {
        method: 'POST',
        headers,
        body: formData
      })
    )
    
    expect(res.status).toBe(200)
    const data = await res.json()
    // Verify it returns a signed URL from SeaweedFS
    expect(data.image).toContain('http://localhost:8333/kyte/avatars/')
    expect(data.image).toContain('.jpg')
  })
})
