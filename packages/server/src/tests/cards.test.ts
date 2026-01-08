import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'

describe('Cards API', () => {
  let boardId: string
  let columnId: string
  let cardId: string

  beforeAll(async () => {
    // Create a board
    const boardRes = await app.handle(
      new Request('http://localhost/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test Board for Cards' })
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
  })

  afterAll(async () => {
    // Cleanup: delete board (should cascade)
    await app.handle(
      new Request(`http://localhost/boards/${boardId}`, { method: 'DELETE' })
    )
  })

  test('POST /cards - create card', async () => {
    const res = await app.handle(
      new Request('http://localhost/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Card',
          description: 'Test description',
          columnId,
          order: 0
        })
      })
    )
    expect(res.status).toBe(200)
    const card = await res.json()
    expect(card.title).toBe('Test Card')
    expect(card.description).toBe('Test description')
    cardId = card.id
  })

  test('GET /cards/:id - get single card', async () => {
    const res = await app.handle(
      new Request(`http://localhost/cards/${cardId}`)
    )
    expect(res.status).toBe(200)
    const card = await res.json()
    expect(card.id).toBe(cardId)
    expect(card.title).toBe('Test Card')
  })

  test('GET /cards/column/:columnId - list cards by column', async () => {
    const res = await app.handle(
      new Request(`http://localhost/cards/column/${columnId}`)
    )
    expect(res.status).toBe(200)
    const cards = await res.json()
    expect(Array.isArray(cards)).toBe(true)
    expect(cards.length).toBeGreaterThan(0)
  })

  test('PATCH /cards/:id - update card with due date', async () => {
    const dueDate = new Date('2025-12-31').toISOString()
    const res = await app.handle(
      new Request(`http://localhost/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Updated Card',
          dueDate
        })
      })
    )
    expect(res.status).toBe(200)
    const card = await res.json()
    expect(card.title).toBe('Updated Card')
    expect(card.dueDate).toBeTruthy()
  })

  test('PATCH /cards/:id - clear due date', async () => {
    const res = await app.handle(
      new Request(`http://localhost/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dueDate: null })
      })
    )
    expect(res.status).toBe(200)
    const card = await res.json()
    expect(card.dueDate).toBeNull()
  })

  test('DELETE /cards/:id - delete card', async () => {
    const res = await app.handle(
      new Request(`http://localhost/cards/${cardId}`, { method: 'DELETE' })
    )
    expect(res.status).toBe(200)
  })
})
