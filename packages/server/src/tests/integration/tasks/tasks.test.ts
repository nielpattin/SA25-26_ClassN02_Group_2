import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  createTestWorkspace,
  createTestBoard,
  createTestColumn,
  cleanupTestUser,
  resetDatabase,
  type TestUser
} from '../../test-helpers'

describe('Tasks API', () => {
  let user: TestUser
  let workspaceId: string
  let boardId: string
  let columnId: string
  let taskId: string

  const app = getTestApp()

  beforeAll(async () => {
    await resetDatabase()
    user = await createTestUser()
    const workspace = await createTestWorkspace(user)
    workspaceId = workspace.id
    const board = await createTestBoard(user, workspaceId)
    boardId = board.id
    const column = await createTestColumn(user, boardId)
    columnId = column.id
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

  test('POST /tasks - create task', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Test Task',
          description: 'Test description',
          columnId,
          position: 'a0'
        })
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.title).toBe('Test Task')
    expect(task.description).toBe('Test description')
    taskId = task.id
  })

  test('GET /tasks/:id - get single task', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.id).toBe(taskId)
    expect(task.title).toBe('Test Task')
    expect(task.labels).toBeDefined()
    expect(task.assignees).toBeDefined()
  })

  test('GET /tasks/:id - returns 401 without auth', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`)
    )
    expect(res.status).toBe(401)
  })

  test('GET /tasks/:id - returns 403 for unauthorized user', async () => {
    const otherUser = await createTestUser()
    
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        headers: getAuthHeaders(otherUser)
      })
    )
    expect(res.status).toBe(403)
    
    await cleanupTestUser(otherUser.id)
  })

  test('GET /tasks/column/:columnId - list tasks by column', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/column/${columnId}`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const tasks = await res.json()
    expect(Array.isArray(tasks)).toBe(true)
    expect(tasks.length).toBeGreaterThan(0)
  })

  test('PATCH /tasks/:id - update task with due date', async () => {
    const dueDate = new Date('2025-12-31').toISOString()
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Updated Task',
          dueDate
        })
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.title).toBe('Updated Task')
    expect(task.dueDate).toBeTruthy()
  })

  test('PATCH /tasks/:id - clear due date', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ dueDate: null })
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.dueDate).toBeNull()
  })

  test('PATCH /tasks/:id - update task with start date', async () => {
    const startDate = new Date('2025-12-01').toISOString()
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ startDate })
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.startDate).toBeTruthy()
  })

  test('DELETE /tasks/:id - delete task', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
  })

  test('POST /tasks - create task with size', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Sized Task',
          description: 'Task with size',
          columnId,
          position: 'a1',
          size: 'xl'
        })
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.title).toBe('Sized Task')
    expect(task.size).toBe('xl')
    taskId = task.id
  })

  test('GET /tasks/:id - includes size in response', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.id).toBe(taskId)
    expect(task.size).toBe('xl')
  })

  test('PATCH /tasks/:id - update task size', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ size: 's' })
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.size).toBe('s')
  })

  test('PATCH /tasks/:id - clear size', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ size: null })
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.size).toBeNull()
  })

  test('POST /tasks - create task with all sizes', async () => {
    const sizes = ['xs', 's', 'm', 'l', 'xl'] as const
    const createdTaskIds: string[] = []

    for (const size of sizes) {
      const res = await app.handle(
        new Request('http://localhost/v1/tasks', {
          method: 'POST',
          headers: getAuthHeaders(user),
          body: JSON.stringify({
            title: `Task with size ${size}`,
            columnId,
            position: `a${2 + sizes.indexOf(size)}`,
            size
          })
        })
      )
      expect(res.status).toBe(200)
      const task = await res.json()
      expect(task.size).toBe(size)
      createdTaskIds.push(task.id)
    }

    for (const id of createdTaskIds) {
      await app.handle(
        new Request(`http://localhost/v1/tasks/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(user)
        })
      )
    }
  })
})
