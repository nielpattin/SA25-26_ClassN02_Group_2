import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'

describe('Checklists API', () => {
  let boardId: string
  let columnId: string
  let taskId: string
  let checklistId: string
  let itemId: string

  beforeAll(async () => {
    // Create a board
    const boardRes = await app.handle(
      new Request('http://localhost/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Board for Checklists' })
      })
    )
    const board = await (boardRes.status === 200 ? boardRes.json() : {id: "00000000-0000-4000-a000-000000000000"})
    boardId = board.id

    // Create a column
    const columnRes = await app.handle(
      new Request('http://localhost/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Column', boardId, position: 'a0' })
      })
    )
    const column = await (columnRes.status === 200 ? columnRes.json() : {id: "00000000-0000-4000-a000-000000000000"})
    columnId = column.id

    // Create a card
    const cardRes = await app.handle(
      new Request('http://localhost/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Card', columnId, position: 'a0' })
      })
    )
    const task = await cardRes.json()
    taskId = task.id
  })

  afterAll(async () => {
    // Cleanup: delete board (should cascade)
    await app.handle(
      new Request(`http://localhost/boards/${boardId}`, { method: 'DELETE' })
    )
  })

  test('POST /checklists - create checklist', async () => {
    const res = await app.handle(
      new Request('http://localhost/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Todo List', taskId, position: "a0" })
      })
    )
    expect(res.status).toBe(200)
    const checklist = await res.json()
    expect(checklist.title).toBe('Todo List')
    expect(checklist.taskId).toBe(taskId)
    checklistId = checklist.id
  })

  test('GET /checklists/card/:cardId - list checklists', async () => {
    const res = await app.handle(
      new Request(`http://localhost/checklists/card/${taskId}`)
    )
    expect(res.status).toBe(200)
    const checklists = await res.json()
    expect(Array.isArray(checklists)).toBe(true)
    expect(checklists.length).toBeGreaterThan(0)
  })

  test('PATCH /checklists/:id - update checklist', async () => {
    const res = await app.handle(
      new Request(`http://localhost/checklists/${checklistId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Todo List' })
      })
    )
    expect(res.status).toBe(200)
    const checklist = await res.json()
    expect(checklist.title).toBe('Updated Todo List')
  })

  test('POST /checklists/items - add item', async () => {
    const res = await app.handle(
      new Request('http://localhost/checklists/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistId, content: 'First task', position: "a0" })
      })
    )
    expect(res.status).toBe(200)
    const item = await res.json()
    expect(item.content).toBe('First task')
    expect(item.isCompleted).toBe(false)
    itemId = item.id
  })

  test('PATCH /checklists/items/:id - update item', async () => {
    const res = await app.handle(
      new Request(`http://localhost/checklists/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated task' })
      })
    )
    expect(res.status).toBe(200)
    const item = await res.json()
    expect(item.content).toBe('Updated task')
  })

  test('POST /checklists/items/:id/toggle - toggle completion', async () => {
    const res = await app.handle(
      new Request(`http://localhost/checklists/items/${itemId}/toggle`, {
        method: 'POST'
      })
    )
    expect(res.status).toBe(200)
    const item = await res.json()
    expect(item.isCompleted).toBe(true)

    // Toggle back
    const res2 = await app.handle(
      new Request(`http://localhost/checklists/items/${itemId}/toggle`, {
        method: 'POST'
      })
    )
    const item2 = await res2.json()
    expect(item2.isCompleted).toBe(false)
  })

  test('DELETE /checklists/items/:id - delete item', async () => {
    const res = await app.handle(
      new Request(`http://localhost/checklists/items/${itemId}`, {
        method: 'DELETE'
      })
    )
    expect(res.status).toBe(200)
  })

  test('DELETE /checklists/:id - delete checklist', async () => {
    const res = await app.handle(
      new Request(`http://localhost/checklists/${checklistId}`, {
        method: 'DELETE'
      })
    )
    expect(res.status).toBe(200)
  })
})
