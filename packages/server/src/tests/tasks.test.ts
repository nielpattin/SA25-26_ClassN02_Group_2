import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser } from './helpers'

describe('Tasks API', () => {
  let boardId: string
  let columnId: string
  let taskId: string

  beforeAll(async () => {
    await ensureTestUser()

    // Create a board
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Test Board for Tasks' })
      })
    )
    const board = await (boardRes.status === 200 ? boardRes.json() : {id: "00000000-0000-4000-a000-000000000000"})
    boardId = board.id

    // Create a column
    const columnRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Test Column', boardId, position: 'a0' })
      })
    )
    const column = await (columnRes.status === 200 ? columnRes.json() : {id: "00000000-0000-4000-a000-000000000000"})
    columnId = column.id
  })

  afterAll(async () => {
    // Cleanup: delete board (should cascade)
    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
    )
  })

  test('POST /tasks - create task', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
    const task = await res.json()
    expect(task.id).toBe(taskId)
    expect(task.title).toBe('Test Task')
    // Check for enriched data
    expect(task.labels).toBeDefined()
    expect(task.assignees).toBeDefined()
  })

  test('GET /tasks/column/:columnId - list tasks by column', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/column/${columnId}`, {
        headers: getAuthHeaders()
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          startDate
        })
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
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
  })
})
