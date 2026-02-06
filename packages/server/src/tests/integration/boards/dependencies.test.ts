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

describe('Dependencies API', () => {
  let user: TestUser
  let boardId: string
  let columnId: string
  let task1Id: string
  let task2Id: string
  let task3Id: string
  let dependencyId: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()
    const workspace = await createTestWorkspace(user)
    const board = await createTestBoard(user, workspace.id)
    boardId = board.id

    const columnRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Column 1', boardId, position: 'a0' })
      })
    )
    const column = await columnRes.json()
    columnId = column.id

    const createTask = async (title: string) => {
      const res = await app.handle(
        new Request('http://localhost/v1/tasks', {
          method: 'POST',
          headers: getAuthHeaders(user),
          body: JSON.stringify({ title, columnId, position: 'a0' })
        })
      )
      return (await res.json()).id
    }

    task1Id = await createTask('Task 1')
    task2Id = await createTask('Task 2')
    task3Id = await createTask('Task 3')
  })

  afterAll(async () => {
    if (boardId) {
      await app.handle(
        new Request(`http://localhost/v1/boards/${boardId}`, {
          method: 'DELETE',
          headers: getAuthHeaders(user)
        })
      )
    }
    await cleanupTestUser(user.id)
  })

  test('POST /tasks/:id/dependencies - create dependency', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${task1Id}/dependencies`, {
        method: 'POST',
        headers: getAuthHeaders(user),
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
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${task2Id}/dependencies`, {
        method: 'POST',
        headers: getAuthHeaders(user),
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
    await app.handle(
      new Request(`http://localhost/v1/tasks/${task2Id}/dependencies`, {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          blockedTaskId: task3Id
        })
      })
    )

    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${task3Id}/dependencies`, {
        method: 'POST',
        headers: getAuthHeaders(user),
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
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const deps = await res.json()
    expect(Array.isArray(deps)).toBe(true)
    expect(deps.length).toBe(2)
  })

  test('GET /boards/:id/dependencies - list board dependencies', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/dependencies`, {
        headers: getAuthHeaders(user)
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
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)

    const res2 = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/dependencies`, {
        headers: getAuthHeaders(user)
      })
    )
    const deps = await res2.json()
    expect(deps.length).toBe(1)
  })
})
