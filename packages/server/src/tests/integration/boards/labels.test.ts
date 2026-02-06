import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  createTestWorkspace,
  createTestBoard,
  createTestColumn,
  cleanupTestUser,
  type TestUser
} from '../../test-helpers'

describe('Labels API', () => {
  let user: TestUser
  let workspaceId: string
  let boardId: string
  let labelId: string
  let taskId: string
  let columnId: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()
    const workspace = await createTestWorkspace(user)
    workspaceId = workspace.id
    const board = await createTestBoard(user, workspaceId)
    boardId = board.id
    const column = await createTestColumn(user, boardId)
    columnId = column.id

    const cardRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ title: 'Test Card', columnId, position: 'a0' })
      })
    )
    const task = await cardRes.json()
    taskId = task.id
  })

  afterAll(async () => {
    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    await cleanupTestUser(user.id)
  })

  test('POST /labels - create label', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/labels', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Bug', color: '#FF0000', boardId })
      })
    )
    expect(res.status).toBe(200)
    const label = await res.json()
    expect(label.name).toBe('Bug')
    expect(label.color).toBe('#FF0000')
    expect(label.boardId).toBe(boardId)
    labelId = label.id
  })

  test('GET /labels/board/:boardId - list labels', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/labels/board/${boardId}`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const labels = await res.json()
    expect(Array.isArray(labels)).toBe(true)
    expect(labels.length).toBeGreaterThan(0)
  })

  test('PATCH /labels/:id - update label', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/labels/${labelId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Critical Bug', color: '#FF5500' })
      })
    )
    expect(res.status).toBe(200)
    const label = await res.json()
    expect(label.name).toBe('Critical Bug')
    expect(label.color).toBe('#FF5500')
  })

  test('POST /labels/card/:taskId/label/:labelId - attach label to task', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/labels/card/${taskId}/label/${labelId}`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
  })

  test('DELETE /labels/card/:taskId/label/:labelId - remove label from task', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/labels/card/${taskId}/label/${labelId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
  })

  test('DELETE /labels/:id - delete label', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/labels/${labelId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
  })
})
