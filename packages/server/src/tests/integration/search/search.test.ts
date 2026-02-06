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
import { db } from '../../../db'
import * as schema from '../../../db/schema'
import { eq } from 'drizzle-orm'

describe('Search API - @assignee operator', () => {
  let user: TestUser
  let secondUser: TestUser
  let workspaceId: string
  let boardId: string
  let columnId: string
  let taskId1: string
  let taskId2: string
  let taskId3: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()
    secondUser = await createTestUser({ name: 'johndoe' })

    const workspace = await createTestWorkspace(user)
    workspaceId = workspace.id

    const board = await createTestBoard(user, workspaceId)
    boardId = board.id

    const column = await createTestColumn(user, boardId)
    columnId = column.id

    const task1Res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Fix login bug',
          description: 'Users cannot login',
          columnId,
          position: 'a0'
        })
      })
    )
    const task1 = await task1Res.json() as { id: string }
    taskId1 = task1.id

    const task2Res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Add search feature',
          description: 'Full text search',
          columnId,
          position: 'a1'
        })
      })
    )
    const task2 = await task2Res.json() as { id: string }
    taskId2 = task2.id

    const task3Res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Review PR',
          description: 'Code review needed',
          columnId,
          position: 'a2'
        })
      })
    )
    const task3 = await task3Res.json() as { id: string }
    taskId3 = task3.id

    await db.insert(schema.taskAssignees).values({ taskId: taskId1, userId: user.id })
    await db.insert(schema.taskAssignees).values({ taskId: taskId2, userId: secondUser.id })
    await db.insert(schema.taskAssignees).values({ taskId: taskId3, userId: user.id })
    await db.insert(schema.taskAssignees).values({ taskId: taskId3, userId: secondUser.id })
  })

  afterAll(async () => {
    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    await cleanupTestUser(user.id)
    await cleanupTestUser(secondUser.id)
  })

  test('@me filters to current user tasks', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=@me', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskId1)
    expect(taskIds).toContain(taskId3)
    expect(taskIds).not.toContain(taskId2)
  })

  test('@username filters by exact name match', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=@johndoe', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskId2)
    expect(taskIds).toContain(taskId3)
    expect(taskIds).not.toContain(taskId1)
  })

  test('multiple @ operators OR together', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=@me%20@johndoe', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskId1)
    expect(taskIds).toContain(taskId2)
    expect(taskIds).toContain(taskId3)
  })

  test('@ operator with text search', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=bug%20@me', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskId1)
    expect(taskIds).not.toContain(taskId2)
    expect(taskIds).not.toContain(taskId3)
  })
})

describe('Search API - #label operator', () => {
  let user: TestUser
  let workspaceId: string
  let boardId: string
  let columnId: string
  let taskId1: string
  let taskId2: string
  let taskId3: string
  let labelId1: string
  let labelId2: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()

    const workspace = await createTestWorkspace(user)
    workspaceId = workspace.id

    const board = await createTestBoard(user, workspaceId)
    boardId = board.id

    const [label1] = await db.insert(schema.labels).values({
      boardId,
      name: 'Urgent',
      color: '#FF0000',
    }).returning()
    labelId1 = label1.id

    const [label2] = await db.insert(schema.labels).values({
      boardId,
      name: 'Backend',
      color: '#00FF00',
    }).returning()
    labelId2 = label2.id

    const column = await createTestColumn(user, boardId)
    columnId = column.id

    const task1Res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Critical API bug',
          description: 'Fix the authentication issue',
          columnId,
          position: 'a0'
        })
      })
    )
    const task1 = await task1Res.json() as { id: string }
    taskId1 = task1.id

    const task2Res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Database migration',
          description: 'Upgrade PostgreSQL',
          columnId,
          position: 'a1'
        })
      })
    )
    const task2 = await task2Res.json() as { id: string }
    taskId2 = task2.id

    const task3Res = await app.handle(
      new Request('http://localhost/v1/tasks', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          title: 'Frontend refactor',
          description: 'Improve component structure',
          columnId,
          position: 'a2'
        })
      })
    )
    const task3 = await task3Res.json() as { id: string }
    taskId3 = task3.id

    await db.insert(schema.taskLabels).values({ taskId: taskId1, labelId: labelId1 })
    await db.insert(schema.taskLabels).values({ taskId: taskId1, labelId: labelId2 })
    await db.insert(schema.taskLabels).values({ taskId: taskId2, labelId: labelId2 })
  })

  afterAll(async () => {
    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    await cleanupTestUser(user.id)
  })

  test('#labelname filters tasks by label (case-insensitive)', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=%23urgent', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskId1)
    expect(taskIds).not.toContain(taskId2)
    expect(taskIds).not.toContain(taskId3)
  })

  test('#label partial match supported', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=%23urg', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskId1)
    expect(taskIds).not.toContain(taskId2)
    expect(taskIds).not.toContain(taskId3)
  })

  test('multiple # operators OR together', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=%23urgent%20%23backend', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskId1)
    expect(taskIds).toContain(taskId2)
    expect(taskIds).not.toContain(taskId3)
  })

  test('# operator with text search', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=api%20%23backend', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskId1)
    expect(taskIds).not.toContain(taskId2)
    expect(taskIds).not.toContain(taskId3)
  })
})

describe('Search API - due: operator', () => {
  let user: TestUser
  let workspaceId: string
  let boardId: string
  let columnId: string
  let taskOverdue: string
  let taskToday: string
  let taskWeek: string
  let taskNoDue: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()

    const workspace = await createTestWorkspace(user)
    workspaceId = workspace.id

    const board = await createTestBoard(user, workspaceId)
    boardId = board.id

    const column = await createTestColumn(user, boardId)
    columnId = column.id

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const in12Hours = new Date(now.getTime() + 12 * 60 * 60 * 1000)
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const [overdueTask] = await db.insert(schema.tasks).values({
      title: 'Overdue task',
      description: 'This task is overdue',
      columnId,
      position: 'a0',
      dueDate: yesterday,
    }).returning()
    taskOverdue = overdueTask.id

    const [todayTask] = await db.insert(schema.tasks).values({
      title: 'Today task',
      description: 'This task is due today',
      columnId,
      position: 'a1',
      dueDate: in12Hours,
    }).returning()
    taskToday = todayTask.id

    const [weekTask] = await db.insert(schema.tasks).values({
      title: 'Week task',
      description: 'This task is due this week',
      columnId,
      position: 'a2',
      dueDate: in3Days,
    }).returning()
    taskWeek = weekTask.id

    const [noDueTask] = await db.insert(schema.tasks).values({
      title: 'No due date task',
      description: 'This task has no due date',
      columnId,
      position: 'a3',
    }).returning()
    taskNoDue = noDueTask.id
  })

  afterAll(async () => {
    await app.handle(
      new Request(`http://localhost/v1/boards/${boardId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    await app.handle(
      new Request(`http://localhost/v1/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(user)
      })
    )
    await cleanupTestUser(user.id)
  })

  test('due:overdue returns tasks with past due dates', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=due:overdue', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskOverdue)
    expect(taskIds).not.toContain(taskToday)
    expect(taskIds).not.toContain(taskWeek)
    expect(taskIds).not.toContain(taskNoDue)
  })

  test('due:today returns tasks due within 24 hours', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=due:today', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskToday)
    expect(taskIds).not.toContain(taskOverdue)
    expect(taskIds).not.toContain(taskNoDue)
  })

  test('due:week returns tasks due within 7 days', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=due:week', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskToday)
    expect(taskIds).toContain(taskWeek)
    expect(taskIds).not.toContain(taskOverdue)
    expect(taskIds).not.toContain(taskNoDue)
  })

  test('due: operator excludes tasks without due dates', async () => {
    const resOverdue = await app.handle(
      new Request('http://localhost/v1/search?q=due:overdue', {
        headers: getAuthHeaders(user)
      })
    )
    const resToday = await app.handle(
      new Request('http://localhost/v1/search?q=due:today', {
        headers: getAuthHeaders(user)
      })
    )
    const resWeek = await app.handle(
      new Request('http://localhost/v1/search?q=due:week', {
        headers: getAuthHeaders(user)
      })
    )

    const overdueResult = await resOverdue.json() as { data: Array<{ id: string, type: string }> }
    const todayResult = await resToday.json() as { data: Array<{ id: string, type: string }> }
    const weekResult = await resWeek.json() as { data: Array<{ id: string, type: string }> }

    const allTaskIds = [
      ...overdueResult.data,
      ...todayResult.data,
      ...weekResult.data
    ].filter(r => r.type === 'task').map(r => r.id)

    expect(allTaskIds).not.toContain(taskNoDue)
  })

  test('due: operator with text search', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/search?q=overdue%20due:overdue', {
        headers: getAuthHeaders(user)
      })
    )
    expect(res.status).toBe(200)
    const result = await res.json() as { data: Array<{ id: string, type: string }> }

    const taskIds = result.data.filter(r => r.type === 'task').map(r => r.id)
    expect(taskIds).toContain(taskOverdue)
    expect(taskIds).not.toContain(taskToday)
    expect(taskIds).not.toContain(taskWeek)
    expect(taskIds).not.toContain(taskNoDue)
  })
})
