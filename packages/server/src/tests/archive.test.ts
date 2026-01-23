import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser } from './helpers'

describe('Archive API', () => {
  let userId: string
  let workspaceId: string
  let boardId: string

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
          name: 'Archive Test User', 
          email: `archive-test-${uniqueId}@example.com` 
        })
      })
    )
    const user = await userRes.json()
    userId = user.id

    // Create a workspace
    const workspaceRes = await app.handle(
      new Request('http://localhost/v1/workspaces', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Archive Test Workspace', slug: `archive-${uniqueId}` })
      })
    )
    const workspace = await workspaceRes.json()
    workspaceId = workspace.id

    // Create a board
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Archive Test Board', workspaceId })
      })
    )
    const board = await boardRes.json()
    boardId = board.id
  })

  afterAll(async () => {
    // Cleanup - use permanent delete once implemented or standard delete
    // For now, standard cleanup
    if (boardId) {
      await app.handle(new Request(`http://localhost/v1/boards/${boardId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders(userId)
      }))
    }
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

  test('GET /workspaces/:id/archived-boards', async () => {
    // Initially empty
    let res = await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}/archived-boards`, {
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)
    let archived = await res.json()
    expect(Array.isArray(archived)).toBe(true)
    expect(archived.length).toBe(0)

    // Archive the board
    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )

    // Should now have 1 archived board
    res = await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}/archived-boards`, {
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)
    archived = await res.json()
    expect(archived.length).toBe(1)
    expect(archived[0].id).toBe(boardId)
    expect(archived[0].archivedAt).not.toBeNull()
  })

  test('POST /boards/:id/restore', async () => {
    // Ensure board is archived first
    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )

    // Restore the board
    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)
    const restored = await res.json()
    expect(restored.id).toBe(boardId)
    expect(restored.archivedAt).toBeNull()

    // Verify it's no longer in archived list
    const archiveRes = await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}/archived-boards`, {
        headers: getAuthHeaders(userId)
      })
    )
    const archived = await archiveRes.json()
    expect(archived.length).toBe(0)
  })

  test('DELETE /boards/:id/permanent', async () => {
    // Permanent delete the board
    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)

    // Verify it's gone from active list
    const boardRes = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}`, {
        headers: getAuthHeaders(userId)
      })
    )
    
    if (boardRes.status === 200) {
      const text = await boardRes.text()
      expect(text === '' || text === 'null').toBe(true)
    } else {
      expect(boardRes.status).toBe(404)
    }
    
    // Clear boardId so afterAll doesn't try to delete it again
    boardId = ''
  })

  test('GET /boards/:id/archived', async () => {
    // Create a new board
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Board with archived items', workspaceId })
      })
    )
    const board = await boardRes.json()
    boardId = board.id

    // Create a column
    const colRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Test Column', boardId })
      })
    )
    const column = await colRes.json()

    // Create a task
    const taskRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ title: 'Test Task', columnId: column.id })
      })
    )
    const task = await taskRes.json()

    // Archive them
    await app.handle(
      new Request(`http://localhost/v1/columns/${column.id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )
    await app.handle(
      new Request(`http://localhost/v1/tasks/${task.id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )

    // GET archived items
    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archived`, {
        headers: getAuthHeaders(userId)
      })
    )
    expect(res.status).toBe(200)
    const archived = await res.json()
    expect(archived.columns.length).toBe(1)
    expect(archived.columns[0].id).toBe(column.id)
    expect(archived.tasks.length).toBe(1)
    expect(archived.tasks[0].id).toBe(task.id)
    expect(archived.tasks[0].columnName).toBe(column.name)
  })

  test('POST /columns/:id/restore and DELETE /columns/:id/permanent', async () => {
    // Get archived column ID
    const archivedItemsRes = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archived`, {
        headers: getAuthHeaders(userId)
      })
    )
    const archivedItems = await archivedItemsRes.json()
    const colId = archivedItems.columns[0].id
    
    const restoreRes = await app.handle(
      new Request(`http://localhost/v1/columns/${colId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )
    expect(restoreRes.status).toBe(200)
    const restoredCol = await restoreRes.json()
    expect(restoredCol.archivedAt).toBeNull()

    // Verify task is also restored
    const boardItemsRes = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/archived`, {
        headers: getAuthHeaders(userId)
      })
    )
    const boardItems = await boardItemsRes.json()
    expect(boardItems.tasks.length).toBe(0)

    // Archive again to test permanent delete
    await app.handle(
      new Request(`http://localhost/v1/columns/${colId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )

    const deleteRes = await app.handle(
      new Request(`http://localhost/v1/columns/${colId}/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders(userId)
      })
    )
    expect(deleteRes.status).toBe(200)

    // Verify it's gone
    const colCheck = await app.handle(
      new Request(`http://localhost/v1/columns/board/${boardId}`, {
        headers: getAuthHeaders(userId)
      })
    )
    const columns = await colCheck.json()
    expect(columns.find((c: any) => c.id === colId)).toBeUndefined()
  })

  test('POST /tasks/:id/restore and DELETE /tasks/:id/permanent', async () => {
    // Create new board, column, and task
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Task Test Board', workspaceId })
      })
    )
    const board = await boardRes.json()
    const bId = board.id

    const colRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Task Test Column', boardId: bId })
      })
    )
    const column = await colRes.json()

    const taskRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ title: 'Task to Restore', columnId: column.id })
      })
    )
    const task = await taskRes.json()
    const taskId = task.id

    // Archive task
    await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )

    // Restore task
    const restoreRes = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )
    expect(restoreRes.status).toBe(200)
    const restoredTask = await restoreRes.json()
    expect(restoredTask.archivedAt).toBeNull()

    // Archive again to test permanent delete
    await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )

    const deleteRes = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/permanent`, {
        method: 'DELETE',
        headers: getAuthHeaders(userId)
      })
    )
    expect(deleteRes.status).toBe(200)

    // Verify it's gone
    const taskCheck = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}`, {
        headers: getAuthHeaders(userId)
      })
    )
    
    if (taskCheck.status === 200) {
      const text = await taskCheck.text()
      expect(text === '' || text === 'null').toBe(true)
    } else {
      expect(taskCheck.status).toBe(404)
    }

    // Cleanup
    await app.handle(new Request(`http://localhost/v1/boards/${bId}/permanent`, { 
      method: 'DELETE',
      headers: getAuthHeaders(userId)
    }))
  })

  test('POST /tasks/:id/restore with deleted column fallback', async () => {
    // Create new board and two columns
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Fallback Test Board', workspaceId })
      })
    )
    const board = await boardRes.json()
    const bId = board.id

    const col1Res = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Column 1', boardId: bId })
      })
    )
    const column1 = await col1Res.json()

    const col2Res = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ name: 'Column 2', boardId: bId })
      })
    )
    const column2 = await col2Res.json()

    // Create task in column 1
    const taskRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(userId),
        body: JSON.stringify({ title: 'Task to Restore Fallback', columnId: column1.id })
      })
    )
    const task = await taskRes.json()
    const taskId = task.id

    // Archive task
    await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )

    // Archive column 1
    await app.handle(
      new Request(`http://localhost/v1/columns/${column1.id}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )

    // Restore task
    const restoreRes = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(userId)
      })
    )
    expect(restoreRes.status).toBe(200)
    const restoredTask = await restoreRes.json()
    expect(restoredTask.archivedAt).toBeNull()
    // Should be moved to column 2 (the first active column)
    expect(restoredTask.columnId).toBe(column2.id)

    // Cleanup
    await app.handle(new Request(`http://localhost/v1/boards/${bId}/permanent`, { 
      method: 'DELETE',
      headers: getAuthHeaders(userId)
    }))
  })
})
