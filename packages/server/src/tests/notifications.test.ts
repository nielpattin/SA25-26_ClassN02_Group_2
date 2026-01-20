import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser, TEST_USER_ID } from './helpers'
import { db } from '../db'
import { notifications } from '../db/schema'
import { eq } from 'drizzle-orm'

describe('Notifications API', () => {
  const SECOND_USER_ID = '00000000-0000-4000-a000-000000000002'
  let boardId: string
  let columnId: string
  let taskId: string

  beforeAll(async () => {
    await ensureTestUser(TEST_USER_ID)
    await ensureTestUser(SECOND_USER_ID)

    // Create a board as User 1
    const boardRes = await app.handle(
      new Request('http://localhost/v1/boards', {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ name: 'Notification Test Board' })
      })
    )
    const board = await boardRes.json()
    boardId = board.id

    // Create a column
    const columnRes = await app.handle(
      new Request('http://localhost/v1/columns', {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ name: 'Todo', boardId, position: 'a0' })
      })
    )
    const column = await columnRes.json()
    columnId = column.id

    // Create a task
    const taskRes = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ title: 'Task to notify', columnId, position: 'a0' })
      })
    )
    const task = await taskRes.json()
    taskId = task.id
  })

  afterAll(async () => {
    // Cleanup
    await db.delete(notifications).where(eq(notifications.userId, TEST_USER_ID))
    await db.delete(notifications).where(eq(notifications.userId, SECOND_USER_ID))
    // Board delete cascades
    if (boardId) {
      await app.handle(new Request(`http://localhost/v1/boards/${boardId}`, { method: 'DELETE', headers: getAuthHeaders(TEST_USER_ID) }))
    }
  })

  test('POST /tasks/:id/assignees - triggers notification for assignee', async () => {
    // User 1 assigns task to User 2
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/assignees`, {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ userId: SECOND_USER_ID })
      })
    )
    expect(res.status).toBe(200)

    // Wait for subscriber to process (it uses EventEmitter which is sync but the handler is async)
    await new Promise(resolve => setTimeout(resolve, 200))

    // Check notifications for User 2
    const notifRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    expect(notifRes.status).toBe(200)
    const data = await notifRes.json()
    expect(Array.isArray(data)).toBe(true)
    
    const assignmentNotif = data.find((n: any) => n.type === 'assignment')
    expect(assignmentNotif).toBeDefined()
    expect(assignmentNotif.taskId).toBe(taskId)
    expect(assignmentNotif.read).toBe(false)
  })

  test('GET /notifications/unread/count - returns correct count', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/notifications/unread/count', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBeGreaterThan(0)
  })

  test('POST /notifications/:id/read - marks notification as read', async () => {
    // Get notifications
    const listRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    const list = await listRes.json()
    const notifId = list[0].id

    // Mark as read
    const readRes = await app.handle(
      new Request(`http://localhost/v1/notifications/${notifId}/read`, {
        method: 'POST',
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    expect(readRes.status).toBe(200)

    // Verify
    const updatedRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    const updatedList = await updatedRes.json()
    const updatedNotif = updatedList.find((n: any) => n.id === notifId)
    expect(updatedNotif.read).toBe(true)
  })

  test('POST /notifications/read-all - marks all as read', async () => {
    // Ensure at least one unread exists
    await db.insert(notifications).values({
      userId: SECOND_USER_ID,
      type: 'comment',
      title: 'Bulk test',
      read: false
    })

    const res = await app.handle(
      new Request('http://localhost/v1/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    expect(res.status).toBe(200)

    const countRes = await app.handle(
      new Request('http://localhost/v1/notifications/unread/count', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    const countData = await countRes.json()
    expect(countData.count).toBe(0)
  })

  test('POST /comments - triggers mention notification', async () => {
    const mentionContent = `Hey @[Test User](${SECOND_USER_ID}) check this out`
    
    const res = await app.handle(
      new Request(`http://localhost/v1/comments`, {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ content: mentionContent, taskId })
      })
    )
    expect(res.status).toBe(201) // commentController sets 201

    await new Promise(resolve => setTimeout(resolve, 200))

    const notifRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    const data = await notifRes.json()
    const mentionNotif = data.find((n: any) => n.type === 'mention')
    expect(mentionNotif).toBeDefined()
    expect(mentionNotif.title).toContain('mentioned you')
  })

  test('POST /boards/:id/members - triggers board invite notification', async () => {
    // User 1 adds User 2 to board
    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ userId: SECOND_USER_ID, role: 'member' })
      })
    )
    expect(res.status).toBe(200)

    await new Promise(resolve => setTimeout(resolve, 200))

    const notifRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    const data = await notifRes.json()
    const inviteNotif = data.find((n: any) => n.type === 'board_invite')
    expect(inviteNotif).toBeDefined()
    expect(inviteNotif.title).toContain('added you')
  })

  test('Should NOT trigger notification for self-assignment', async () => {
    // User 1 assigns task to User 1
    await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/assignees`, {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ userId: TEST_USER_ID })
      })
    )

    await new Promise(resolve => setTimeout(resolve, 200))

    const notifRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(TEST_USER_ID)
      })
    )
    const data = await notifRes.json()
    const selfNotif = data.find((n: any) => n.type === 'assignment')
    expect(selfNotif).toBeUndefined()
  })

  test('POST /notifications/:id/read - returns 403 for another user notification', async () => {
    // Get User 2's notification
    const listRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    const list = await listRes.json()
    expect(list.length).toBeGreaterThan(0)
    const notifId = list[0].id

    // User 1 tries to mark User 2's notification as read
    const res = await app.handle(
      new Request(`http://localhost/v1/notifications/${notifId}/read`, {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID)
      })
    )
    expect(res.status).toBe(403)
  })

  test('DELETE /notifications/:id - returns 403 for another user notification', async () => {
    // Get User 2's notification
    const listRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(SECOND_USER_ID)
      })
    )
    const list = await listRes.json()
    expect(list.length).toBeGreaterThan(0)
    const notifId = list[0].id

    // User 1 tries to delete User 2's notification
    const res = await app.handle(
      new Request(`http://localhost/v1/notifications/${notifId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(TEST_USER_ID)
      })
    )
    expect(res.status).toBe(403)
  })

  test('POST /notifications/:id/read - returns 404 for non-existent notification', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/notifications/00000000-0000-0000-0000-000000000000/read', {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID)
      })
    )
    expect(res.status).toBe(404)
  })

  test('DELETE /notifications/:id - returns 404 for non-existent notification', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/notifications/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
        headers: getAuthHeaders(TEST_USER_ID)
      })
    )
    expect(res.status).toBe(404)
  })

  test('Sequential mentions are correctly extracted (regex statefulness fix)', async () => {
    const THIRD_USER_ID = '00000000-0000-4000-a000-000000000003'
    await ensureTestUser(THIRD_USER_ID)

    await db.delete(notifications).where(eq(notifications.userId, THIRD_USER_ID))

    const mention1 = `First @[User Two](${SECOND_USER_ID}) mention`
    const mention2 = `Second @[User Three](${THIRD_USER_ID}) mention`

    await app.handle(
      new Request('http://localhost/v1/comments', {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ content: mention1, taskId })
      })
    )

    await app.handle(
      new Request('http://localhost/v1/comments', {
        method: 'POST',
        headers: getAuthHeaders(TEST_USER_ID),
        body: JSON.stringify({ content: mention2, taskId })
      })
    )

    await new Promise(resolve => setTimeout(resolve, 200))

    const notifRes3 = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(THIRD_USER_ID)
      })
    )
    const data3 = await notifRes3.json()
    const mentionNotif3 = data3.find((n: any) => n.type === 'mention')
    expect(mentionNotif3).toBeDefined()
    expect(mentionNotif3.body).toContain('Second')
  })
})
