import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  createTestWorkspace,
  createTestBoard,
  cleanupTestUser,
  type TestUser
} from '../../test-helpers'

describe('Archive API', () => {
  let user: TestUser
  let workspaceId: string
  let boardId: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()
    const workspace = await createTestWorkspace(user)
    workspaceId = workspace.id
    const board = await createTestBoard(user, workspaceId, { name: 'Archive Test Board' })
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
  })

  test('GET /workspaces/:id/archived-boards', async () => {
    let res = await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}/archived-boards`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    let archived = await res.json()
    expect(Array.isArray(archived)).toBe(true)
    expect(archived.length).toBe(0)

    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )

    res = await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}/archived-boards`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    archived = await res.json()
    expect(archived.length).toBe(1)
    expect(archived[0].id).toBe(boardId)
    expect(archived[0].archivedAt).not.toBeNull()
  })

  test('POST /boards/:id/restore', async () => {
    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )

    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const restored = await res.json()
    expect(restored.id).toBe(boardId)
    expect(restored.archivedAt).toBeNull()

    const archiveRes = await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}/archived-boards`, {
        headers: getAuthHeaders(user)
      })
    )
    const archived = await archiveRes.json()
    expect(archived.length).toBe(0)
  })

  test('DELETE /boards/:id/permanent', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)

    const boardRes = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}`, {
        headers: getAuthHeaders(user)
      })
    )

    if (boardRes.status === 200) {
      const text = await boardRes.text()
      expect(text === '' || text === 'null').toBe(true)
    } else {
      expect(boardRes.status).toBe(404)
    }

    boardId = ''
  })

  test('GET /boards/:id/archived', async () => {
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Board with archived items', workspaceId })
      })
    )
    const board = await boardRes.json()
    boardId = board.id

    const colRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Test Column', boardId })
      })
    )
    const column = await colRes.json()

    const taskRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ title: 'Test Task', columnId: column.id })
      })
    )
    const task = await taskRes.json()

    await app.handle(
      new Request(`http://localhost/v1/columns/${column.id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    await app.handle(
      new Request(`http://localhost/v1/tasks/${task.id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )

    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archived`, {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const archived = await res.json()
    expect(archived.columns.length).toBe(1)
    expect(archived.columns[0].id).toBe(column.id)
    expect(archived.tasks.length).toBe(1)
    expect(archived.tasks[0].id).toBe(task.id)
  })

  test('POST /columns/:id/restore and DELETE /columns/:id/permanent', async () => {
    const archivedItemsRes = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archived`, {
        headers: getAuthHeaders(user)
      })
    )
    const archivedItems = await archivedItemsRes.json()
    const colId = archivedItems.columns[0].id

    const restoreRes = await app.handle(
      new Request(`http://localhost/v1/columns/${colId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    expect(restoreRes.status).toBe(200)
    const restoredCol = await restoreRes.json()
    expect(restoredCol.archivedAt).toBeNull()

    const boardItemsRes = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archived`, {
        headers: getAuthHeaders(user)
      })
    )
    const boardItems = await boardItemsRes.json()
    expect(boardItems.tasks.length).toBe(0)

    await app.handle(
      new Request(`http://localhost/v1/columns/${colId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )

    const deleteRes = await app.handle(
      new Request(`http://localhost/v1/columns/${colId}/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(deleteRes.status).toBe(200)

    const colCheck = await app.handle(
      new Request(`http://localhost/v1/columns/board/${boardId}`, {
        headers: getAuthHeaders(user)
      })
    )
    const columns = await colCheck.json()
    expect(columns.find((c: any) => c.id === colId)).toBeUndefined()
  })

  test('POST /tasks/:id/restore and DELETE /tasks/:id/permanent', async () => {
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Task Test Board', workspaceId })
      })
    )
    const board = await boardRes.json()
    const bId = board.id

    const colRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Task Test Column', boardId: bId })
      })
    )
    const column = await colRes.json()

    const taskRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ title: 'Task to Restore', columnId: column.id })
      })
    )
    const task = await taskRes.json()
    const taskId = task.id

    await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )

    const restoreRes = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    expect(restoreRes.status).toBe(200)
    const restoredTask = await restoreRes.json()
    expect(restoredTask.archivedAt).toBeNull()

    await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )

    const deleteRes = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    expect(deleteRes.status).toBe(200)

    const taskCheck = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        headers: getAuthHeaders(user)
      })
    )

    if (taskCheck.status === 200) {
      const text = await taskCheck.text()
      expect(text === '' || text === 'null').toBe(true)
    } else {
      expect(taskCheck.status).toBe(404)
    }

    await app.handle(new Request(`http://localhost/v1/boards/${bId}/permanent`, {
      method: 'DELETE',
      headers: getAuthHeaders(user)
    }))
  })

  test('POST /tasks/:id/restore with deleted column fallback', async () => {
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Fallback Test Board', workspaceId })
      })
    )
    const board = await boardRes.json()
    const bId = board.id

    const col1Res = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Column 1', boardId: bId })
      })
    )
    const column1 = await col1Res.json()

    const col2Res = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ name: 'Column 2', boardId: bId })
      })
    )
    const column2 = await col2Res.json()

    const taskRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ title: 'Task to Restore Fallback', columnId: column1.id })
      })
    )
    const task = await taskRes.json()
    const taskId = task.id

    await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )

    await app.handle(
      new Request(`http://localhost/v1/columns/${column1.id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )

    const restoreRes = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(user)
      })
    )
    expect(restoreRes.status).toBe(200)
    const restoredTask = await restoreRes.json()
    expect(restoredTask.archivedAt).toBeNull()
    expect(restoredTask.columnId).toBe(column2.id)

    await app.handle(new Request(`http://localhost/v1/boards/${bId}/permanent`, {
      method: 'DELETE',
      headers: getAuthHeaders(user)
    }))
  })
})
