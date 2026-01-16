import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser } from './helpers'

describe('Labels API', () => {
  let boardId: string
  let labelId: string
  let taskId: string
  let columnId: string

  beforeAll(async () => {
    await ensureTestUser()

    // Create a board
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Test Board for Labels' })
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

    // Create a card
    const cardRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: 'Test Card', columnId, position: 'a0' })
      })
    )
    const task = await (cardRes.status === 200 ? cardRes.json() : {id: "00000000-0000-4000-a000-000000000000"})
    taskId = task.id
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

  test('POST /labels - create label', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/labels', {
        method: 'POST',
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders()
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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json()
    expect(result.taskId).toBe(taskId)
    expect(result.labelId).toBe(labelId)
  })

  test('DELETE /labels/card/:taskId/label/:labelId - remove label from task', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/labels/card/${taskId}/label/${labelId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
  })

  test('DELETE /labels/:id - delete label', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/labels/${labelId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
    )
    expect(res.status).toBe(200)
  })
})
