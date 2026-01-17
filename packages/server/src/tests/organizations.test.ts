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
        headers: getAuthHeaders(userId)
      }))
    }
    if (userId) {
      await app.handle(new Request(`http://localhost/v1/users/${userId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      }))
    }
  })

  test('POST /organizations - create organization (auto-adds member)', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/organizations', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Test Org', slug: 'test-org' })
      })
    )
    expect(res.status).toBe(200)
    const org = await res.json()
    expect(org.name).toBe('Test Org')
    expect(org.slug).toBe('test-org')
    orgId = org.id

    // Verify automatic membership
    const membersRes = await app.handle(
      new Request(`http://localhost/v1/organizations/${orgId}/members`, {
        headers: getAuthHeaders(userId)
      })
    )
    expect(membersRes.status).toBe(200)
    const members = await membersRes.json()
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBe(1)
    expect(members[0].userId).toBe(userId)
    expect(members[0].role).toBe('owner')
  })

  test('GET /organizations/user/:userId - user organizations', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/organizations/user/${userId}`, {
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)
    const orgs = await res.json()
    expect(Array.isArray(orgs)).toBe(true)
    expect(orgs.length).toBeGreaterThanOrEqual(1)
    const myOrg = orgs.find((o: any) => o.id === orgId)
    expect(myOrg).toBeDefined()
  })

  test('POST /boards - create board in organization', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Org Board', organizationId: orgId })
      })
    )
    expect(res.status).toBe(200)
    const board = await res.json()
    expect(board.organizationId).toBe(orgId)
    
    // Cleanup board
    await app.handle(new Request(`http://localhost/v1/boards/${board.id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders(userId)
    }))
  })
})
