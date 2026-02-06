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

describe('Checklists API', () => {
  let user: TestUser
  let workspaceId: string
  let boardId: string
  let columnId: string
  let taskId: string
  let checklistId: string
  let itemId: string

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

  test('POST /checklists - create checklist', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/checklists', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ title: 'Todo List', taskId, position: 'a0' })
      })
    )
    expect(res.status).toBe(200)
    const checklist = await res.json()
    expect(checklist.title).toBe('Todo List')
    expect(checklist.taskId).toBe(taskId)
    checklistId = checklist.id
  })

  test('GET /checklists/task/:taskId - list checklists', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/checklists/task/${taskId}`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const checklists = await res.json()
    expect(Array.isArray(checklists)).toBe(true)
    expect(checklists.length).toBeGreaterThan(0)
  })

  test('PATCH /checklists/:id - update checklist', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/checklists/${checklistId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ title: 'Updated Todo List' })
      })
    )
    expect(res.status).toBe(200)
    const checklist = await res.json()
    expect(checklist.title).toBe('Updated Todo List')
  })

  test('POST /checklists/items - add item', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/checklists/items', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ checklistId, content: 'First task', position: 'a0' })
      })
    )
    expect(res.status).toBe(200)
    const item = await res.json()
    expect(item.content).toBe('First task')
    itemId = item.id
  })

  test('PATCH /checklists/items/:id - update item', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/checklists/items/${itemId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ content: 'Updated task' })
      })
    )
    expect(res.status).toBe(200)
    const item = await res.json()
    expect(item.content).toBe('Updated task')
  })

  test('POST /checklists/items/:id/toggle - toggle completion', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/checklists/items/${itemId}/toggle`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const item = await res.json()
    expect(item.isCompleted).toBe(true)

    const res2 = await app.handle(
      new Request(`http://localhost/v1/checklists/items/${itemId}/toggle`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    expect(res2.status).toBe(200)
    const item2 = await res2.json()
    expect(item2.isCompleted).toBe(false)
  })

  test('DELETE /checklists/items/:id - delete item', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/checklists/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
  })

  test('DELETE /checklists/:id - delete checklist', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/checklists/${checklistId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
  })
})
