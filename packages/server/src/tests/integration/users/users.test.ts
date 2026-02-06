import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  cleanupTestUser,
  resetDatabase,
  type TestUser
} from '../../test-helpers'
import { db } from '../../../db'
import { sessions, users } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '../../../modules/auth/auth'

describe('Users & Sessions API', () => {
  let user: TestUser
  let otherUser: TestUser

  const app = getTestApp()

  beforeAll(async () => {
    await resetDatabase()
    user = await createTestUser()
    otherUser = await createTestUser()
    
    await db.insert(sessions).values([
      {
        id: `extra-session-1-${user.id.slice(0, 8)}`,
        userId: user.id,
        token: 'token-1',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
      },
      {
        id: `extra-session-2-${user.id.slice(0, 8)}`,
        userId: user.id,
        token: 'token-2',
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
      }
    ]).onConflictDoNothing()
  })

  afterAll(async () => {
    await db.delete(sessions).where(eq(sessions.userId, user.id))
    await cleanupTestUser(user.id)
    await cleanupTestUser(otherUser.id)
  })

  test('GET /users/:id/sessions - list sessions', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/sessions`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThanOrEqual(2)

    const current = data.find((s: { isCurrent: boolean }) => s.isCurrent)
    expect(current).toBeDefined()

    const mobile = data.find((s: { id: string }) => s.id === `extra-session-1-${user.id.slice(0, 8)}`)
    expect(mobile).toBeDefined()
    expect(mobile.isCurrent).toBe(false)
  })

  test('DELETE /users/:id/sessions/:sessionId - revoke session', async () => {
    const listRes = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/sessions`, {
        headers: getAuthHeaders(user)
      })
    )
    const sessionsList = await listRes.json()
    const currentSession = sessionsList.find((s: { isCurrent: boolean }) => s.isCurrent)

    const resFail = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/sessions/${currentSession.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(resFail.status).toBe(400)
    const errorData = await resFail.json()
    expect(errorData.success).toBe(false)
    expect(errorData.error).toBe('Cannot revoke current session')

    const otherSessionId = `extra-session-1-${user.id.slice(0, 8)}`
    const resSuccess = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/sessions/${otherSessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(resSuccess.status).toBe(200)
    expect(await resSuccess.json()).toEqual({ success: true })

    const dbSessions = await db.select().from(sessions).where(
      and(eq(sessions.userId, user.id), eq(sessions.id, otherSessionId))
    )
    expect(dbSessions.length).toBe(0)
  })

  test('POST /users/:id/sessions/revoke-all - revoke all except current', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/sessions/revoke-all`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.count).toBeGreaterThanOrEqual(0)

    const dbSessions = await db.select().from(sessions).where(eq(sessions.userId, user.id))
    expect(dbSessions.length).toBe(1)
  })

  test('GET /users/:id/sessions - unauthorized access', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/sessions`, {
        headers: getAuthHeaders(otherUser)
      })
    )
    expect(res.status).toBe(403)
  })

  test('PATCH /users/:id/notification-preferences - update partially', async () => {
    const res1 = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/notification-preferences`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          mention: { email: false }
        })
      })
    )
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.notificationPreferences.mention.email).toBe(false)
    expect(data1.notificationPreferences.mention.inApp).toBe(true)
    expect(data1.notificationPreferences.comment.email).toBe(true)

    const res2 = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/notification-preferences`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          comment: { inApp: false }
        })
      })
    )
    expect(res2.status).toBe(200)
    const data2 = await res2.json()
    expect(data2.notificationPreferences.comment.inApp).toBe(false)
    expect(data2.notificationPreferences.comment.email).toBe(true)
    expect(data2.notificationPreferences.mention.email).toBe(false)
  })

  test('DELETE /users/:id - soft delete account', async () => {
    const testPassword = 'Password123!'
    const email = `delete-test-${Date.now()}@example.com`
    
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
    
    await db.update(users).set({ emailVerified: true }).where(eq(users.id, deleteTestUserId))

    const signInRes = await app.handle(
      new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: testPassword })
      })
    )
    const setCookie = signInRes.headers.get('set-cookie')
    if (!setCookie) throw new Error('No session cookie')
    const sessionCookie = setCookie.split(';')[0]
    const deleteUserAuth = { 'Content-Type': 'application/json', 'Cookie': sessionCookie }

    const resFail = await app.handle(
      new Request(`http://localhost/v1/users/${deleteTestUserId}`, {
        method: 'DELETE',
        headers: deleteUserAuth,
        body: JSON.stringify({ password: 'wrong-password' })
      })
    )
    expect(resFail.status).toBe(403)

    const resSuccess = await app.handle(
      new Request(`http://localhost/v1/users/${deleteTestUserId}`, {
        method: 'DELETE',
        headers: deleteUserAuth,
        body: JSON.stringify({ password: testPassword })
      })
    )
    expect(resSuccess.status).toBe(200)
    const data = await resSuccess.json()
    expect(data.message).toContain('Account scheduled for deletion')

    const [deletedUser] = await db.select().from(users).where(eq(users.id, deleteTestUserId))
    expect(deletedUser.deletedAt).not.toBeNull()

    const dbSessions = await db.select().from(sessions).where(eq(sessions.userId, deleteTestUserId))
    expect(dbSessions.length).toBe(0)
  })

  test('Login blocked for soft-deleted users', async () => {
    const testPassword = 'Password123!'
    const email = `login-block-${Date.now()}@example.com`
    
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

    await db.update(users).set({ deletedAt: new Date(), emailVerified: true }).where(eq(users.id, deletedUserId))

    const result = await auth.api.signInEmail({
      body: {
        email,
        password: testPassword,
      }
    })
    
    expect(result).toBeDefined()
    expect(result.user.id).toBe(deletedUserId)

    const userAfter = await db.query.users.findFirst({
      where: eq(users.id, deletedUserId)
    })
    expect(userAfter?.deletedAt).not.toBeNull()

    const signInRes = await app.handle(
      new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: testPassword })
      })
    )
    const setCookie = signInRes.headers.get('set-cookie')
    if (!setCookie) throw new Error('No session cookie')
    const sessionCookie = setCookie.split(';')[0]
    const deletedUserAuth = { 'Content-Type': 'application/json', 'Cookie': sessionCookie }

    const res401 = await app.handle(
      new Request(`http://localhost/v1/users/${deletedUserId}/restore`, {
        method: 'PATCH'
      })
    )
    expect(res401.status).toBe(401)

    const res403 = await app.handle(
      new Request(`http://localhost/v1/users/${deletedUserId}/restore`, {
        method: 'PATCH',
        headers: getAuthHeaders(user)
      })
    )
    expect(res403.status).toBe(403)

    const resRestore = await app.handle(
      new Request(`http://localhost/v1/users/${deletedUserId}/restore`, {
        method: 'PATCH',
        headers: deletedUserAuth
      })
    )
    expect(resRestore.status).toBe(200)

    const userRestored = await db.query.users.findFirst({
      where: eq(users.id, deletedUserId)
    })
    expect(userRestored?.deletedAt).toBeNull()
  })

  test('Session includes deletedAt field for soft-deleted users', async () => {
    const testPassword = 'Password123!'
    const email = `session-deleted-${Date.now()}@example.com`
    
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email,
        password: testPassword,
        name: 'Session Deleted Test',
      }
    })
    
    if (!signUpResult || !('user' in signUpResult)) {
      throw new Error('Failed to sign up test user')
    }
    
    const testUserId = signUpResult.user.id

    await db.update(users).set({ deletedAt: new Date(), emailVerified: true }).where(eq(users.id, testUserId))

    const signInResult = await auth.api.signInEmail({
      body: {
        email,
        password: testPassword,
      }
    })
    
    expect(signInResult).toBeDefined()
    expect(signInResult.user.id).toBe(testUserId)
    expect(signInResult.user.deletedAt).toBeDefined()
    expect(signInResult.user.deletedAt).not.toBeNull()
  })

  test('GET /users/:id/export - export user data', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/export`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    
    expect(data.user).toBeDefined()
    expect(data.user.id).toBe(user.id)
    expect(Array.isArray(data.workspaces)).toBe(true)
    expect(Array.isArray(data.boards)).toBe(true)
    expect(Array.isArray(data.columns)).toBe(true)
    expect(Array.isArray(data.tasks)).toBe(true)
    expect(Array.isArray(data.comments)).toBe(true)

    const res401 = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/export`)
    )
    expect(res401.status).toBe(401)

    const res403 = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/export`, {
        headers: getAuthHeaders(otherUser)
      })
    )
    expect(res403.status).toBe(403)
  })

  test('POST /users/:id/avatar - upload avatar', async () => {
    const jpegBytes = new Uint8Array([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
    ])
    const blob = new Blob([jpegBytes], { type: 'image/jpeg' })
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    
    const formData = new FormData()
    formData.append('file', file)

    const headers = getAuthHeaders(user)
    delete (headers as Record<string, string>)['Content-Type']

    const res = await app.handle(
      new Request(`http://localhost/v1/users/${user.id}/avatar`, {
        method: 'POST',
        headers,
        body: formData
      })
    )
    
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.image).toContain('http://localhost:8333/kyte/avatars/')
    expect(data.image).toContain('.jpg')
  })
})
