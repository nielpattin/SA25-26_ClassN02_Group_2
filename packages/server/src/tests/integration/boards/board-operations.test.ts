import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  createTestWorkspace,
  createTestBoard,
  cleanupTestUser,
  resetDatabase,
  type TestUser
} from '../../test-helpers'

describe('Board Operations API', () => {
  let user: TestUser
  let otherUser: TestUser
  let workspaceId: string
  let boardId: string

  const app = getTestApp()

  beforeAll(async () => {
    await resetDatabase()
    user = await createTestUser()
    otherUser = await createTestUser()
    const workspace = await createTestWorkspace(user)
    workspaceId = workspace.id
    const board = await createTestBoard(user, workspaceId, { name: 'Operations Test Board' })
    boardId = board.id
  })

  afterAll(async () => {
    if (boardId) {
      await app.handle(new Request(`http://localhost/v1/boards/${boardId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      }))
    }
    await cleanupTestUser(user.id)
    await cleanupTestUser(otherUser.id)
  })

  describe('POST /boards/:id/visit', () => {
    test('should record visit for authenticated user', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/visit`, {
          method: 'POST',
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.boardId).toBe(boardId)
      expect(data.userId).toBe(user.id)
      expect(data.visitedAt).toBeDefined()
    })

    test('should return 401 without authentication', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/visit`, {
          method: 'POST'
        })
      )
      expect(res.status).toBe(401)
    })

    test('should update visitedAt on subsequent visits', async () => {
      await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/visit`, {
          method: 'POST',
          headers: getAuthHeaders(user)
        })
      )

      await new Promise(resolve => setTimeout(resolve, 100))

      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/visit`, {
          method: 'POST',
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
    })
  })

  describe('GET /boards/recent', () => {
    test('should return recently visited boards', async () => {
      await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/visit`, {
          method: 'POST',
          headers: getAuthHeaders(user)
        })
      )

      const res = await app.handle(
        new Request('http://localhost/v1/boards/recent', {
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
      const recentBoards = await res.json()
      expect(Array.isArray(recentBoards)).toBe(true)
      expect(recentBoards.length).toBeGreaterThan(0)
      expect(recentBoards[0].id).toBe(boardId)
    })

    test('should return 401 without authentication', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/boards/recent')
      )
      expect(res.status).toBe(401)
    })
  })

  describe('POST /boards/:id/star', () => {
    test('should star a board', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/star`, {
          method: 'POST',
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
    })

    test('should return 401 without authentication', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/star`, {
          method: 'POST'
        })
      )
      expect(res.status).toBe(401)
    })
  })

  describe('DELETE /boards/:id/star', () => {
    test('should unstar a board', async () => {
      await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/star`, {
          method: 'POST',
          headers: getAuthHeaders(user)
        })
      )

      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/star`, {
          method: 'DELETE',
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
    })
  })

  describe('GET /boards/:id/preferences', () => {
    test('should get board preferences (defaults when none set)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/preferences`, {
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
      const prefs = await res.json()
      expect(prefs.view).toBe('kanban')
    })

    test('should return 401 without authentication', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/preferences`)
      )
      expect(res.status).toBe(401)
    })
  })

  describe('PUT /boards/:id/preferences', () => {
    test('should update board preferences', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/preferences`, {
          method: 'PUT',
          headers: getAuthHeaders(user),
          body: JSON.stringify({ view: 'calendar' })
        })
      )
      expect(res.status).toBe(200)
      const prefs = await res.json()
      expect(prefs.view).toBe('calendar')
    })
  })

  describe('Board member operations', () => {
    test('POST /boards/:id/members - should add member', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/members`, {
          method: 'POST',
          headers: getAuthHeaders(user),
          body: JSON.stringify({ userId: otherUser.id, role: 'member' })
        })
      )
      expect(res.status).toBe(200)
    })

    test('GET /boards/:id/members - should list members', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/members`, {
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
      const members = await res.json()
      expect(Array.isArray(members)).toBe(true)
      expect(members.length).toBeGreaterThan(0)
    })

    test('DELETE /boards/:id/members/:userId - should remove member', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/members/${otherUser.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
    })
  })

  describe('GET /boards/:id/export', () => {
    test('should export board as JSON', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/export?format=json`, {
          headers: getAuthHeaders(user)
        })
      )
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')
      expect(res.headers.get('Content-Disposition')).toContain('attachment')
    })

    test('should return 401 without authentication', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}/export?format=json`)
      )
      expect(res.status).toBe(401)
    })
  })
})
