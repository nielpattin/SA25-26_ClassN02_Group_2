import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  createTestWorkspace,
  createTestBoard,
  createTestColumn,
  createTestTask,
  cleanupTestUser,
  resetDatabase,
  waitForNotification,
  ensureNoNotification,
  type TestUser
} from '../../test-helpers'
import { db } from '../../../db'
import { notifications } from '../../../db/schema'
import { eq } from 'drizzle-orm'

describe('Notifications API', () => {
  let user1: TestUser
  let user2: TestUser
  let boardId: string
  let columnId: string
  let taskId: string

  const app = getTestApp()

  beforeAll(async () => {
    await resetDatabase()
    user1 = await createTestUser()
    user2 = await createTestUser()

    const workspace = await createTestWorkspace(user1)
    const board = await createTestBoard(user1, workspace.id)
    boardId = board.id

    const column = await createTestColumn(user1, boardId)
    columnId = column.id

    const task = await createTestTask(user1, columnId)
    taskId = task.id
  })

  afterAll(async () => {
    await db.delete(notifications).where(eq(notifications.userId, user1.id))
    await db.delete(notifications).where(eq(notifications.userId, user2.id))
    if (boardId) {
      await app.handle(new Request(`http://localhost/v1/boards/${boardId}`, { 
        method: 'DELETE', 
        headers: getAuthHeaders(user1) 
      }))
    }
    await cleanupTestUser(user1.id)
    await cleanupTestUser(user2.id)
  })

  test('POST /tasks/:id/assignees - triggers notification for assignee', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/assignees`, {
        method: 'POST',
        headers: getAuthHeaders(user1),
        body: JSON.stringify({ userId: user2.id })
      })
    )
    expect(res.status).toBe(200)

    const assignmentNotif = await waitForNotification(user2.id, 'assignment')
    expect(assignmentNotif.taskId).toBe(taskId)
    expect(assignmentNotif.read).toBe(false)
  })

  test('GET /notifications/unread/count - returns correct count', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/notifications/unread/count', {
        headers: getAuthHeaders(user2)
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.count).toBeGreaterThan(0)
  })

  test('POST /notifications/:id/read - marks notification as read', async () => {
    const listRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(user2)
      })
    )
    const list = await listRes.json()
    const notifId = list[0].id

    const readRes = await app.handle(
      new Request(`http://localhost/v1/notifications/${notifId}/read`, {
        method: 'POST',
        headers: getAuthHeaders(user2)
      })
    )
    expect(readRes.status).toBe(200)

    const updatedRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(user2)
      })
    )
    const updatedList = await updatedRes.json()
    const updatedNotif = updatedList.find((n: { id: string }) => n.id === notifId)
    expect(updatedNotif.read).toBe(true)
  })

  test('POST /notifications/read-all - marks all as read', async () => {
    await db.insert(notifications).values({
      userId: user2.id,
      type: 'comment',
      title: 'Bulk test',
      read: false
    })

    const res = await app.handle(
      new Request('http://localhost/v1/notifications/read-all', {
        method: 'POST',
        headers: getAuthHeaders(user2)
      })
    )
    expect(res.status).toBe(200)

    const countRes = await app.handle(
      new Request('http://localhost/v1/notifications/unread/count', {
        headers: getAuthHeaders(user2)
      })
    )
    const countData = await countRes.json()
    expect(countData.count).toBe(0)
  })

  test('POST /comments - triggers mention notification', async () => {
    const mentionContent = `Hey @[Test User](${user2.id}) check this out`
    
    const res = await app.handle(
      new Request('http://localhost/v1/comments', {
        method: 'POST',
        headers: getAuthHeaders(user1),
        body: JSON.stringify({ content: mentionContent, taskId })
      })
    )
    expect(res.status).toBe(201)

    const mentionNotif = await waitForNotification(user2.id, 'mention')
    expect(mentionNotif.title).toContain('mentioned you')
  })

  test('POST /boards/:id/members - triggers board invite notification', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(user1),
        body: JSON.stringify({ userId: user2.id, role: 'member' })
      })
    )
    expect(res.status).toBe(200)

    const inviteNotif = await waitForNotification(user2.id, 'board_invite')
    expect(inviteNotif.title).toContain('added you')
  })

  test('Should NOT trigger notification for self-assignment', async () => {
    await app.handle(
      new Request(`http://localhost/v1/tasks/${taskId}/assignees`, {
        method: 'POST',
        headers: getAuthHeaders(user1),
        body: JSON.stringify({ userId: user1.id })
      })
    )

    await ensureNoNotification(user1.id, 'assignment')
  })

  test('POST /notifications/:id/read - returns 403 for another user notification', async () => {
    const listRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(user2)
      })
    )
    const list = await listRes.json()
    expect(list.length).toBeGreaterThan(0)
    const notifId = list[0].id

    const res = await app.handle(
      new Request(`http://localhost/v1/notifications/${notifId}/read`, {
        method: 'POST',
        headers: getAuthHeaders(user1)
      })
    )
    expect(res.status).toBe(403)
  })

  test('DELETE /notifications/:id - returns 403 for another user notification', async () => {
    const listRes = await app.handle(
      new Request('http://localhost/v1/notifications', {
        headers: getAuthHeaders(user2)
      })
    )
    const list = await listRes.json()
    expect(list.length).toBeGreaterThan(0)
    const notifId = list[0].id

    const res = await app.handle(
      new Request(`http://localhost/v1/notifications/${notifId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user1)
      })
    )
    expect(res.status).toBe(403)
  })

  test('POST /notifications/:id/read - returns 404 for non-existent notification', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/notifications/00000000-0000-0000-0000-000000000000/read', {
        method: 'POST',
        headers: getAuthHeaders(user1)
      })
    )
    expect(res.status).toBe(404)
  })

  test('DELETE /notifications/:id - returns 404 for non-existent notification', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/notifications/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
        headers: getAuthHeaders(user1)
      })
    )
    expect(res.status).toBe(404)
  })

  test('Sequential mentions are correctly extracted (regex statefulness fix)', async () => {
    const user3 = await createTestUser()

    await db.delete(notifications).where(eq(notifications.userId, user3.id))

    const mention1 = `First @[User Two](${user2.id}) mention`
    const mention2 = `Second @[User Three](${user3.id}) mention`

    await app.handle(
      new Request('http://localhost/v1/comments', {
        method: 'POST',
        headers: getAuthHeaders(user1),
        body: JSON.stringify({ content: mention1, taskId })
      })
    )

    await app.handle(
      new Request('http://localhost/v1/comments', {
        method: 'POST',
        headers: getAuthHeaders(user1),
        body: JSON.stringify({ content: mention2, taskId })
      })
    )

    const mentionNotif3 = await waitForNotification(user3.id, 'mention')
    expect(mentionNotif3.body).toContain('Second')

    await cleanupTestUser(user3.id)
  })
})
