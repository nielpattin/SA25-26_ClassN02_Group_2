import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser } from './helpers'

describe('Idempotency', () => {
  let boardId: string
  let columnId: string

  beforeAll(async () => {
    await ensureTestUser()

    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Idempotency Test Board' })
      })
    )
    const board = await boardRes.json()
    boardId = board.id

    const columnRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: 'Test Column', boardId, position: 'a0' })
      })
    )
    const column = await columnRes.json()
    columnId = column.id
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

  test('should return cached response for duplicate request with same key', async () => {
    const key = `key-${Date.now()}`
    const payload = {
      title: 'Idempotent Task',
      columnId,
      position: 'a0'
    }

    const res1 = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Idempotency-Key': key
        },
        body: JSON.stringify(payload)
      })
    )
    expect(res1.status).toBe(200)
    const data1 = await res1.json()
    expect(data1.title).toBe('Idempotent Task')

    const res2 = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Idempotency-Key': key
        },
        body: JSON.stringify(payload)
      })
    )
    expect(res2.status).toBe(200)
    const data2 = await res2.json()

    expect(data2.id).toBe(data1.id)
    expect(data2.createdAt).toBe(data1.createdAt)
  })

  test('should return 400 Bad Request when same key is used for different request body', async () => {
    const key = `key-mismatch-${Date.now()}`
    
    await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Idempotency-Key': key
        },
        body: JSON.stringify({ title: 'Original Task', columnId, position: 'a0' })
      })
    )

    const res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Idempotency-Key': key
        },
        body: JSON.stringify({ title: 'Modified Task', columnId, position: 'a0' })
      })
    )

    expect(res.status).toBe(400)
    const error = await res.json()
    expect(error.error.code).toBe('BAD_REQUEST')
    expect(error.error.message).toContain('Idempotency Key reuse detected')
  })

  test('should allow same key for different users', async () => {
    const key = `shared-key-${Date.now()}`
    const otherUser = '00000000-0000-4000-a000-000000000002'
    await ensureTestUser(otherUser)

    const resA = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Idempotency-Key': key
        },
        body: JSON.stringify({ title: 'User A Task', columnId, position: 'a0' })
      })
    )
    expect(resA.status).toBe(200)

    const resB = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(otherUser),
          'Idempotency-Key': key
        },
        body: JSON.stringify({ title: 'User B Task', columnId, position: 'b0' })
      })
    )
    expect(resB.status).toBe(200)
    const dataA = await resA.json()
    const dataB = await resB.json()
    expect(dataA.id).not.toBe(dataB.id)
  })
})
