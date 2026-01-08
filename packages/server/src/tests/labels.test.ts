import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'

describe('Labels API', () => {
  let boardId: string
  let labelId: string
  let cardId: string
  let columnId: string

  beforeAll(async () => {
    // Create a board
    const boardRes = await app.handle(
      new Request('http://localhost/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Board for Labels' })
      })
    )
    const board = await boardRes.json()
    boardId = board.id

    // Create a column
    const columnRes = await app.handle(
      new Request('http://localhost/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Column', boardId, order: 0 })
      })
    )
    const column = await columnRes.json()
    columnId = column.id

    // Create a card
    const cardRes = await app.handle(
      new Request('http://localhost/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Card', columnId, order: 0 })
      })
    )
    const card = await cardRes.json()
    cardId = card.id
  })

  afterAll(async () => {
    // Cleanup: delete board (should cascade)
    await app.handle(
      new Request(`http://localhost/boards/${boardId}`, { method: 'DELETE' })
    )
  })

  test('POST /labels - create label', async () => {
    const res = await app.handle(
      new Request('http://localhost/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      new Request(`http://localhost/labels/board/${boardId}`)
    )
    expect(res.status).toBe(200)
    const labels = await res.json()
    expect(Array.isArray(labels)).toBe(true)
    expect(labels.length).toBeGreaterThan(0)
  })

  test('PATCH /labels/:id - update label', async () => {
    const res = await app.handle(
      new Request(`http://localhost/labels/${labelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Critical Bug', color: '#FF5500' })
      })
    )
    expect(res.status).toBe(200)
    const label = await res.json()
    expect(label.name).toBe('Critical Bug')
    expect(label.color).toBe('#FF5500')
  })

  test('POST /labels/card/:cardId/label/:labelId - attach label to card', async () => {
    const res = await app.handle(
      new Request(`http://localhost/labels/card/${cardId}/label/${labelId}`, {
        method: 'POST'
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json()
    expect(result.cardId).toBe(cardId)
    expect(result.labelId).toBe(labelId)
  })

  test('DELETE /labels/card/:cardId/label/:labelId - remove label from card', async () => {
    const res = await app.handle(
      new Request(`http://localhost/labels/card/${cardId}/label/${labelId}`, {
        method: 'DELETE'
      })
    )
    expect(res.status).toBe(200)
  })

  test('DELETE /labels/:id - delete label', async () => {
    const res = await app.handle(
      new Request(`http://localhost/labels/${labelId}`, { method: 'DELETE' })
    )
    expect(res.status).toBe(200)
  })
})
