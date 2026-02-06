import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  createTestWorkspace,
  cleanupTestUser,
  type TestUser
} from '../../test-helpers'

describe('Workspaces API', () => {
  let user: TestUser
  let workspaceId: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()
  })

  afterAll(async () => {
    if (workspaceId) {
      await app.handle(new Request(`http://localhost/v1/workspaces/${workspaceId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders(user)
      }))
    }
    await cleanupTestUser(user.id)
  })

  test('POST /workspaces - create workspace (auto-adds member)', async () => {
    const uniqueSlug = `test-ws-${crypto.randomUUID().slice(0, 8)}`
    const res = await app.handle(
      new Request('http://localhost/v1/workspaces', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Test Workspace', slug: uniqueSlug })
      })
    )
    expect(res.status).toBe(200)
    const workspace = await res.json()
    expect(workspace.name).toBe('Test Workspace')
    expect(workspace.slug).toBe(uniqueSlug)
    workspaceId = workspace.id

    const membersRes = await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}/members`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(membersRes.status).toBe(200)
    const members = await membersRes.json()
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBe(1)
    expect(members[0].userId).toBe(user.id)
    expect(members[0].role).toBe('owner')
  })

  test('GET /workspaces/user/:userId - user workspaces', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/workspaces/user/${user.id}`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const workspaces = await res.json()
    expect(Array.isArray(workspaces)).toBe(true)
    expect(workspaces.length).toBeGreaterThanOrEqual(1)
    const myWorkspace = workspaces.find((o: { id: string }) => o.id === workspaceId)
    expect(myWorkspace).toBeDefined()
  })

  test('POST /boards - create board in workspace', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Workspace Board', workspaceId: workspaceId })
      })
    )
    expect(res.status).toBe(200)
    const board = await res.json()
    expect(board.workspaceId).toBe(workspaceId)
    
    await app.handle(new Request(`http://localhost/v1/boards/${board.id}`, { 
      method: 'DELETE',
      headers: getAuthHeaders(user)
    }))
  })
})
