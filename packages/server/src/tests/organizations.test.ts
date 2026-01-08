import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'

describe('Organizations API', () => {
  let userId: string
  let orgId: string

  beforeAll(async () => {
    const uniqueId = Math.random().toString(36).substring(7)
    // Create a user
    const userRes = await app.handle(
      new Request('http://localhost/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await app.handle(new Request(`http://localhost/organizations/${orgId}`, { method: 'DELETE' }))
    }
    if (userId) {
      await app.handle(new Request(`http://localhost/users/${userId}`, { method: 'DELETE' }))
    }
  })

  test('POST /organizations - create organization', async () => {
    const res = await app.handle(
      new Request('http://localhost/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      new Request(`http://localhost/organizations/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      new Request(`http://localhost/organizations/${orgId}/members`)
    )
    expect(res.status).toBe(200)
    const members = await res.json()
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBe(1)
    expect(members[0].userId).toBe(userId)
  })

  test('GET /organizations/user/:userId - user organizations', async () => {
    const res = await app.handle(
      new Request(`http://localhost/organizations/user/${userId}`)
    )
    expect(res.status).toBe(200)
    const orgs = await res.json()
    expect(Array.isArray(orgs)).toBe(true)
    expect(orgs.length).toBe(1)
    expect(orgs[0].id).toBe(orgId)
  })

  test('POST /boards - create board in organization', async () => {
    const res = await app.handle(
      new Request('http://localhost/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Org Board', organizationId: orgId })
      })
    )
    expect(res.status).toBe(200)
    const board = await res.json()
    expect(board.organizationId).toBe(orgId)
    
    // Cleanup board
    await app.handle(new Request(`http://localhost/boards/${board.id}`, { method: 'DELETE' }))
  })
})
