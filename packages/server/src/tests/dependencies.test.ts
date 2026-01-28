import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser } from './helpers'

describe('Dependencies API', () => {
  let boardId: string
  let columnId: string
  let task1Id: string
  let task2Id: string
  let task3Id: string
  let dependencyId: string

  beforeAll(async () => {
    await ensureTestUser()

    // Create a board
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Test Board for Dependencies' })
      })
    )
    const board = await boardRes.json()
    boardId = board.id

    // Create a column
    const columnRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Column 1', boardId, position: 'a0' })
      })
    )
    const column = await columnRes.json()
    columnId = column.id

    // Create tasks
    const createTasks = async (title: string) => {
      const res = await app.handle(
        new Request('http://localhost/v1/tasks', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title, columnId, position: 'a0' })
        })
      )
      return (await res.json()).id
    }

    task1Id = await createTasks('Task 1')
    task2Id = await createTasks('Task 2')
    task3Id = await createTasks('Task 3')
  })

  afterAll(async () => {
    if (boardId) {
      await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
      )
    }
  })

  test('POST /tasks/:id/dependencies - create dependency', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${task1Id}/dependencies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          blockedTaskId: task2Id,
          type: 'finish_to_start'
        })
      })
    )
    expect(res.status).toBe(200)
    const dep = await res.json()
    expect(dep.blockingTaskId).toBe(task1Id)
    expect(dep.blockedTaskId).toBe(task2Id)
    dependencyId = dep.id
  })

  test('POST /tasks/:id/dependencies - prevent circular dependency', async () => {
    // 1 -> 2 already exists
    // Try adding 2 -> 1
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${task2Id}/dependencies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          blockedTaskId: task1Id
        })
      })
    )
    expect(res.status).toBe(400)
    const error = await res.json()
    expect(error.error.message).toContain('Circular dependency')
  })

  test('POST /tasks/:id/dependencies - prevent transitive cycle', async () => {
    // 1 -> 2 exists
    // Add 2 -> 3
    await app.handle(
      new Request(`http://localhost/v1/tasks/${task2Id}/dependencies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          blockedTaskId: task3Id
        })
      })
    )

    // Try adding 3 -> 1
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${task3Id}/dependencies`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          blockedTaskId: task1Id
        })
      })
    )
    expect(res.status).toBe(400)
  })

  test('GET /tasks/:id/dependencies - list task dependencies', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${task2Id}/dependencies`, {
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
    const deps = await res.json()
    expect(Array.isArray(deps)).toBe(true)
    // Should see 1 -> 2 and 2 -> 3
    expect(deps.length).toBe(2)
  })

  test('GET /boards/:id/dependencies - list board dependencies', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/dependencies`, {
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
    const deps = await res.json()
    expect(Array.isArray(deps)).toBe(true)
    expect(deps.length).toBe(2)
  })

  test('DELETE /dependencies/:id - remove dependency', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/dependencies/${dependencyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)

    // Verify it's gone
    const res2 = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/dependencies`, {
        headers: getAuthHeaders()
      })
    )
    const deps = await res2.json()
    expect(deps.length).toBe(1) // only 2 -> 3 remains
  })
})
