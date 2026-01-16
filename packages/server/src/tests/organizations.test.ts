import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser } from './helpers'

describe('Organizations API', () => {
  let userId: string
  let orgId: string

  beforeAll(async () => {
    await ensureTestUser()
    const uniqueId = Math.random().toString(36).substring(7)
    // Create a user
    const userRes = await app.handle(
      new Request('http://localhost/v1/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          id: `user-${uniqueId}`, 
          name: 'Test User', 
          email: `test-${uniqueId}@example.com` 
        })
      })
    )
    if (userRes.status !== 200) {
      console.error('User creation failed:', await userRes.text())
    }
    const user = await userRes.json()
    userId = user.id
  })

  afterAll(async () => {
    // Cleanup
    if (orgId) {
      await app.handle(new Request(`http://localhost/v1/organizations/${orgId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      }))
    }
    if (userId) {
      await app.handle(new Request(`http://localhost/v1/users/${userId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      }))
    }
  })

  test('POST /organizations - create organization', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/organizations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Test Org', slug: 'test-org' })
      })
    )
    expect(res.status).toBe(200)
    const org = await res.json()
    expect(org.name).toBe('Test Org')
    expect(org.slug).toBe('test-org')
    orgId = org.id
  })

  test('POST /organizations/:id/members - add member', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/organizations/${orgId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ userId, role: 'owner' })
      })
    )
    expect(res.status).toBe(200)
    const member = await res.json()
    expect(member.userId).toBe(userId)
    expect(member.role).toBe('owner')
  })

  test('GET /organizations/:id/members - list members', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/organizations/${orgId}/members`, {
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
    const members = await res.json()
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBe(1)
    expect(members[0].userId).toBe(userId)
  })

  test('GET /organizations/user/:userId - user organizations', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/organizations/user/${userId}`, {
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
    const orgs = await res.json()
    expect(Array.isArray(orgs)).toBe(true)
    expect(orgs.length).toBe(1)
    expect(orgs[0].id).toBe(orgId)
  })

  test('POST /boards - create board in organization', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Org Board', organizationId: orgId })
      })
    )
    expect(res.status).toBe(200)
    const board = await res.json()
    expect(board.organizationId).toBe(orgId)
    
    // Cleanup board
    await app.handle(new Request(`http://localhost/v1/boards/${board.id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders()
    }))
  })
})
