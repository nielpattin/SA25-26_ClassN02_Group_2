import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser } from './helpers'

describe('Workspaces API', () => {
  let userId: string
  let workspaceId: string

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
    if (workspaceId) {
      await app.handle(new Request(`http://localhost/v1/workspaces/${workspaceId}`, { 
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

  test('POST /workspaces - create workspace (auto-adds member)', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/workspaces', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Test Workspace', slug: 'test-workspace' })
      })
    )
    expect(res.status).toBe(200)
    const workspace = await res.json()
    expect(workspace.name).toBe('Test Workspace')
    expect(workspace.slug).toBe('test-workspace')
    workspaceId = workspace.id

    // Verify automatic membership
    const membersRes = await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}/members`, {
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

  test('GET /workspaces/user/:userId - user workspaces', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/workspaces/user/${userId}`, {
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)
    const workspaces = await res.json()
    expect(Array.isArray(workspaces)).toBe(true)
    expect(workspaces.length).toBeGreaterThanOrEqual(1)
    const myWorkspace = workspaces.find((o: any) => o.id === workspaceId)
    expect(myWorkspace).toBeDefined()
  })

  test('POST /boards - create board in workspace', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Workspace Board', workspaceId: workspaceId })
      })
    )
    expect(res.status).toBe(200)
    const board = await res.json()
    expect(board.workspaceId).toBe(workspaceId)
    
    // Cleanup board
    await app.handle(new Request(`http://localhost/v1/boards/${board.id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders(userId)
    }))
  })
})
