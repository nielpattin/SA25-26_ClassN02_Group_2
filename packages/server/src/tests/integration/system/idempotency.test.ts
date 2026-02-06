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

describe('Idempotency', () => {
  let user: TestUser
  let otherUser: TestUser
  let boardId: string
  let columnId: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()
    otherUser = await createTestUser()

    const workspace = await createTestWorkspace(user)
    const board = await createTestBoard(user, workspace.id)
    boardId = board.id

    const column = await createTestColumn(user, boardId)
    columnId = column.id
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
    await cleanupTestUser(otherUser.id)
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
          ...getAuthHeaders(user),
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
          ...getAuthHeaders(user),
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
          ...getAuthHeaders(user),
          'Idempotency-Key': key
        },
        body: JSON.stringify({ title: 'Original Task', columnId, position: 'a0' })
      })
    )

    const res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(user),
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

    const resA = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(user),
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
