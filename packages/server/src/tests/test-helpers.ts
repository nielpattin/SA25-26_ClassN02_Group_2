import { createApp } from '../app'
import { db } from '../db'
import * as schema from '../db/schema'
import { eq, sql, and } from 'drizzle-orm'
import { initNotificationSubscriber } from '../modules/notifications/notification.subscriber'
import { initActivitySubscriber } from '../modules/activities/activity.subscriber'

type NotificationType = typeof schema.notifications.$inferSelect['type']

export interface WaitForOptions {
  timeout?: number
  interval?: number
  message?: string
}

export async function waitFor<T>(
  condition: () => T | Promise<T>,
  options: WaitForOptions = {}
): Promise<NonNullable<T>> {
  const { timeout = 2000, interval = 50, message = 'Condition not met' } = options
  const start = Date.now()

  while (Date.now() - start < timeout) {
    const result = await condition()
    if (result) return result as NonNullable<T>
    await new Promise(r => setTimeout(r, interval))
  }

  throw new Error(`waitFor timeout: ${message}`)
}

export async function waitForNotification(
  userId: string,
  type: NotificationType,
  options: WaitForOptions = {}
): Promise<typeof schema.notifications.$inferSelect> {
  return waitFor(
    async () => {
      const notif = await db.query.notifications.findFirst({
        where: and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.type, type)
        ),
        orderBy: (n, { desc }) => desc(n.createdAt)
      })
      return notif ?? null
    },
    { message: `Notification type '${type}' for user ${userId}`, ...options }
  )
}

export async function ensureNoNotification(
  userId: string,
  type: NotificationType,
  delay = 100
): Promise<void> {
  await new Promise(r => setTimeout(r, delay))
  const notif = await db.query.notifications.findFirst({
    where: and(
      eq(schema.notifications.userId, userId),
      eq(schema.notifications.type, type)
    )
  })
  if (notif) {
    throw new Error(`Unexpected notification type '${type}' found for user ${userId}`)
  }
}

let appInstance: ReturnType<typeof createApp> | null = null
let subscribersInitialized = false

export function getTestApp() {
  if (!appInstance) {
    appInstance = createApp()
    
    if (!subscribersInitialized) {
      initActivitySubscriber()
      initNotificationSubscriber()
      subscribersInitialized = true
    }
  }
  return appInstance
}

export function resetTestApp() {
  appInstance = null
}

export async function resetDatabase(): Promise<void> {
  await db.execute(sql`
    TRUNCATE TABLE
      activities,
      admin_audit_log,
      attachments,
      board_members,
      board_templates,
      board_visits,
      boards,
      checklist_items,
      checklists,
      columns,
      comment_mentions,
      comments,
      idempotency_keys,
      labels,
      members,
      notifications,
      rate_limits,
      starred_boards,
      task_assignees,
      task_dependencies,
      task_labels,
      task_templates,
      tasks,
      user_board_preferences,
      verification,
      workspaces,
      session,
      account,
      "user"
    RESTART IDENTITY CASCADE
  `)
  testUsers.clear()
}

export interface TestUser {
  id: string
  email: string
  name: string
  sessionCookie: string
}

const testUsers = new Map<string, TestUser>()

export async function createTestUser(options: {
  email?: string
  password?: string
  name?: string
  adminRole?: 'super_admin' | 'moderator' | 'support' | null
} = {}): Promise<TestUser> {
  const app = getTestApp()
  const uniqueId = crypto.randomUUID().slice(0, 8)
  const email = options.email ?? `test-${uniqueId}@example.com`
  const password = options.password ?? 'testpassword123'
  const name = options.name ?? `Test User ${uniqueId}`

  const signUpRes = await app.handle(
    new Request('http://localhost/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    })
  )

  if (!signUpRes.ok) {
    const error = await signUpRes.text()
    throw new Error(`Failed to sign up: ${error}`)
  }

  const signUpData = await signUpRes.json()
  const userId = signUpData.user.id

  await db.update(schema.users)
    .set({ 
      emailVerified: true,
      adminRole: options.adminRole ?? null 
    })
    .where(eq(schema.users.id, userId))

  const signInRes = await app.handle(
    new Request('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
  )

  if (!signInRes.ok) {
    const error = await signInRes.text()
    throw new Error(`Failed to sign in: ${error}`)
  }

  const setCookie = signInRes.headers.get('set-cookie')
  if (!setCookie) {
    throw new Error('No session cookie returned')
  }

  const sessionCookie = setCookie.split(';')[0]

  const testUser: TestUser = {
    id: userId,
    email,
    name,
    sessionCookie,
  }

  testUsers.set(userId, testUser)
  return testUser
}

export function getAuthHeaders(user: TestUser): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cookie': user.sessionCookie
  }
}

export async function cleanupTestUser(userId: string): Promise<void> {
  await db.delete(schema.notifications).where(eq(schema.notifications.userId, userId))
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId))
  await db.delete(schema.accounts).where(eq(schema.accounts.userId, userId))
  
  await db.delete(schema.boardTemplates).where(eq(schema.boardTemplates.createdBy, userId))
  await db.update(schema.boardTemplates)
    .set({ approvedBy: null })
    .where(eq(schema.boardTemplates.approvedBy, userId))
  
  const memberships = await db.query.members.findMany({
    where: eq(schema.members.userId, userId),
  })
  
  for (const m of memberships) {
    const workspace = await db.query.workspaces.findFirst({
      where: eq(schema.workspaces.id, m.workspaceId)
    })
    if (workspace?.personal) {
      await db.delete(schema.members).where(eq(schema.members.workspaceId, m.workspaceId))
      await db.delete(schema.workspaces).where(eq(schema.workspaces.id, m.workspaceId))
    }
  }
  
  await db.delete(schema.users).where(eq(schema.users.id, userId))
  testUsers.delete(userId)
}

export async function cleanupAllTestUsers(): Promise<void> {
  for (const userId of testUsers.keys()) {
    await cleanupTestUser(userId)
  }
}

export async function createTestWorkspace(user: TestUser, options: {
  name?: string
  slug?: string
} = {}): Promise<{ id: string; name: string; slug: string }> {
  const app = getTestApp()
  const uniqueId = crypto.randomUUID().slice(0, 8)
  
  const res = await app.handle(
    new Request('http://localhost/v1/workspaces', {
      method: 'POST',
      headers: getAuthHeaders(user),
      body: JSON.stringify({
        name: options.name ?? `Test Workspace ${uniqueId}`,
        slug: options.slug ?? `test-ws-${uniqueId}`
      })
    })
  )

  if (!res.ok) {
    throw new Error(`Failed to create workspace: ${await res.text()}`)
  }

  return res.json()
}

export async function createTestBoard(user: TestUser, workspaceId: string, options: {
  name?: string
} = {}): Promise<{ id: string; name: string; workspaceId: string }> {
  const app = getTestApp()
  const uniqueId = crypto.randomUUID().slice(0, 8)
  
  const res = await app.handle(
    new Request('http://localhost/v1/boards', {
      method: 'POST',
      headers: getAuthHeaders(user),
      body: JSON.stringify({
        name: options.name ?? `Test Board ${uniqueId}`,
        workspaceId
      })
    })
  )

  if (!res.ok) {
    throw new Error(`Failed to create board: ${await res.text()}`)
  }

  return res.json()
}

export async function createTestColumn(user: TestUser, boardId: string, options: {
  name?: string
  position?: string
} = {}): Promise<{ id: string; name: string; boardId: string }> {
  const app = getTestApp()
  
  const res = await app.handle(
    new Request('http://localhost/v1/columns', {
      method: 'POST',
      headers: getAuthHeaders(user),
      body: JSON.stringify({
        name: options.name ?? 'Test Column',
        boardId,
        position: options.position ?? 'a0'
      })
    })
  )

  if (!res.ok) {
    throw new Error(`Failed to create column: ${await res.text()}`)
  }

  return res.json()
}

export async function createTestTask(user: TestUser, columnId: string, options: {
  title?: string
  description?: string
  position?: string
} = {}): Promise<{ id: string; title: string; columnId: string }> {
  const app = getTestApp()
  const uniqueId = crypto.randomUUID().slice(0, 8)
  
  const res = await app.handle(
    new Request('http://localhost/v1/tasks', {
      method: 'POST',
      headers: getAuthHeaders(user),
      body: JSON.stringify({
        title: options.title ?? `Test Task ${uniqueId}`,
        description: options.description,
        columnId,
        position: options.position ?? 'a0'
      })
    })
  )

  if (!res.ok) {
    throw new Error(`Failed to create task: ${await res.text()}`)
  }

  return res.json()
}
