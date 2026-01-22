import { auth } from '../modules/auth/auth'
import { db } from '../db'
import * as schema from '../db/schema'
import { generatePositions } from '../shared/position'
import { eq, sql } from 'drizzle-orm'

const TEST_USER = {
  email: 'test@kyte.dev',
  password: 'password123',
  name: 'Test User',
}

const ADDITIONAL_USERS = Array.from({ length: 21 }, (_, i) => ({
  email: `dev${i + 1}@kyte.dev`,
  password: 'password123',
  name: `Developer ${String.fromCharCode(65 + i)}`,
}))

const COMMENTS_POOL = [
  "Working on the fix now.",
  "This looks like a priority.",
  "Can we discuss this in the next sync?",
  "I've updated the description with more details.",
  "LGTM!",
  "Merged to main.",
  "Need more info on the reproduction steps.",
  "I'll take a look at this tomorrow.",
  "Great job on the initial implementation!",
  "Is this blocking anyone?",
]

async function ensureUserExists(userData: { email: string; password: string; name: string }) {
  try {
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: userData.email,
        password: userData.password,
        name: userData.name,
      },
    })
    
    if (signUpResult && 'user' in signUpResult) {
      return signUpResult.user.id
    }
  } catch {
    // User likely exists
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.email, userData.email),
  })
  
  if (!existingUser) throw new Error(`Failed to create or find test user: ${userData.email}`)
  return existingUser.id
}

async function cleanDatabase() {
  console.log('Cleaning existing data...')
  const tables = [
    schema.notifications,
    schema.commentMentions,
    schema.comments,
    schema.attachments,
    schema.checklistItems,
    schema.checklists,
    schema.taskLabels,
    schema.taskAssignees,
    schema.activities,
    schema.idempotencyKeys,
    schema.starredBoards,
    schema.tasks,
    schema.columns,
    schema.labels,
    schema.boardMembers,
    schema.boards,
    schema.boardTemplates,
    schema.taskTemplates,
    schema.members,
    schema.workspaces,
    schema.sessions,
    schema.accounts,
    schema.verifications,
    schema.users,
  ]

  for (const table of tables) {
    await db.delete(table)
  }
}

async function ensureSearchVectors() {
  console.log('Ensuring search vectors exist...')
  await db.execute(sql`
    ALTER TABLE boards
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, ''))
    ) STORED
  `)
  await db.execute(sql`
    ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
    ) STORED
  `)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_boards_search_vector ON boards USING gin(search_vector)`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tasks_search_vector ON tasks USING gin(search_vector)`)
}

async function seed() {
  console.log('--- Seeding started ---')

  await ensureSearchVectors()
  await cleanDatabase()

  console.log('Creating users...')
  const allUserIds = await Promise.all([
    ensureUserExists(TEST_USER),
    ...ADDITIONAL_USERS.map(u => ensureUserExists(u))
  ])
  const ownerId = allUserIds[0]

  console.log('Creating workspace and members...')
  const [workspace] = await db.insert(schema.workspaces).values({
    name: 'Seed Workspace',
    slug: `seed-workspace-${Date.now()}`,
    personal: true,
  }).returning()

  await db.insert(schema.members).values(
    allUserIds.map((id, index) => ({
      workspaceId: workspace.id,
      userId: id,
      role: (index === 0 ? 'owner' : 'member') as 'owner' | 'member',
    }))
  )

  const priorities = ['low', 'medium', 'high', 'urgent', 'none'] as const
  const getRandomDate = () => {
    const dayOffset = Math.floor(Math.random() * 15) - 7
    return new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000)
  }

  const taskLabelsToInsert: any[] = []
  const taskAssigneesToInsert: any[] = []
  const taskCommentsToInsert: any[] = []
  const checklistsToInsert: any[] = []

  const prepareTaskData = (taskId: string, labels: any[]) => {
    const numLabels = Math.floor(Math.random() * 4)
    if (numLabels > 0) {
      const shuffled = [...labels].sort(() => 0.5 - Math.random())
      for (let j = 0; j < numLabels; j++) {
        taskLabelsToInsert.push({ taskId, labelId: shuffled[j].id })
      }
    }

    const numAssignees = Math.floor(Math.random() * 4)
    if (numAssignees > 0) {
      const shuffledUsers = [...allUserIds].sort(() => 0.5 - Math.random())
      for (let j = 0; j < numAssignees; j++) {
        taskAssigneesToInsert.push({ taskId, userId: shuffledUsers[j], assignedBy: ownerId })
      }
    }

    const numComments = Math.floor(Math.random() * 4)
    for (let j = 0; j < numComments; j++) {
      taskCommentsToInsert.push({
        taskId,
        userId: allUserIds[Math.floor(Math.random() * allUserIds.length)],
        content: COMMENTS_POOL[Math.floor(Math.random() * COMMENTS_POOL.length)],
      })
    }
  }

  const labelData = [
    { name: 'Bug', color: '#e74c3c' },
    { name: 'Feature', color: '#2ecc71' },
    { name: 'UI/UX', color: '#9b59b6' },
    { name: 'Research', color: '#3498db' },
    { name: 'Important', color: '#f1c40f' },
    { name: 'Docs', color: '#34495e' },
  ]

  console.log('Creating boards, columns and tasks...')
  const boardPositions = generatePositions(null, null, 2)
  
  const [smallBoard] = await db.insert(schema.boards).values({
    name: 'Small Board',
    workspaceId: workspace.id,
    ownerId: ownerId,
    position: boardPositions[0],
    visibility: 'private',
  }).returning()

  await db.insert(schema.boardMembers).values(
    allUserIds.map((id, index) => ({
      boardId: smallBoard.id,
      userId: id,
      role: (index === 0 ? 'admin' : 'member') as 'admin' | 'member',
    }))
  )

  const smallLabels = await db.insert(schema.labels).values(
    labelData.map(l => ({ ...l, boardId: smallBoard.id }))
  ).returning()

  const smallColNames = ['To Do', 'Done']
  const smallColPositions = generatePositions(null, null, 2)
  const smallColumns = await db.insert(schema.columns).values(
    smallColNames.map((name, i) => ({
      name,
      boardId: smallBoard.id,
      position: smallColPositions[i],
    }))
  ).returning()

  for (const col of smallColumns) {
    const taskPositions = generatePositions(null, null, 3)
    const tasks = await db.insert(schema.tasks).values(
      Array.from({ length: 3 }).map((_, i) => ({
        title: `Simple Task ${i + 1} in ${col.name}`,
        columnId: col.id,
        position: taskPositions[i],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        dueDate: Math.random() > 0.4 ? getRandomDate() : null,
      }))
    ).returning()
    
    for (const task of tasks) {
      prepareTaskData(task.id, smallLabels)
    }
  }

  const [bigBoard] = await db.insert(schema.boards).values({
    name: 'Big Board',
    workspaceId: workspace.id,
    ownerId: ownerId,
    position: boardPositions[1],
    visibility: 'private',
  }).returning()

  await db.insert(schema.boardMembers).values(
    allUserIds.map((id, index) => ({
      boardId: bigBoard.id,
      userId: id,
      role: (index === 0 ? 'admin' : 'member') as 'admin' | 'member',
    }))
  )

  const bigLabels = await db.insert(schema.labels).values(
    labelData.map(l => ({ ...l, boardId: bigBoard.id }))
  ).returning()

  const bigColNames = ['Backlog', 'Analysis', 'Design', 'Ready', 'In Dev', 'Testing', 'Review', 'Staging', 'Prod', 'Done']
  const bigColPositions = generatePositions(null, null, 10)
  const bigColumns = await db.insert(schema.columns).values(
    bigColNames.map((name, i) => ({
      name,
      boardId: bigBoard.id,
      position: bigColPositions[i],
    }))
  ).returning()

  for (const col of bigColumns) {
    const taskPositions = generatePositions(null, null, 15)
    const tasks = await db.insert(schema.tasks).values(
      Array.from({ length: 15 }).map((_, i) => ({
        title: `Detailed Task ${i + 1} in ${col.name}`,
        description: `Description for task ${i + 1}.`,
        columnId: col.id,
        position: taskPositions[i],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        dueDate: Math.random() > 0.3 ? getRandomDate() : null,
      }))
    ).returning()

    for (const task of tasks) {
      prepareTaskData(task.id, bigLabels)
      
      if (Math.random() > 0.4) {
        checklistsToInsert.push({
          taskId: task.id,
          title: 'Project Requirements',
          position: 'a',
        })
      }
    }
  }

  console.log('Performing final bulk inserts...')
  if (taskLabelsToInsert.length > 0) await db.insert(schema.taskLabels).values(taskLabelsToInsert)
  if (taskAssigneesToInsert.length > 0) await db.insert(schema.taskAssignees).values(taskAssigneesToInsert)
  if (taskCommentsToInsert.length > 0) await db.insert(schema.comments).values(taskCommentsToInsert)
  
  if (checklistsToInsert.length > 0) {
    const insertedChecklists = await db.insert(schema.checklists).values(checklistsToInsert).returning()
    const checklistItemsData: any[] = []
    for (const cl of insertedChecklists) {
      const numItems = Math.floor(Math.random() * 5) + 2
      const itemPositions = generatePositions(null, null, numItems)
      for (let j = 0; j < numItems; j++) {
        checklistItemsData.push({
          checklistId: cl.id,
          content: `Requirement step ${j + 1}`,
          isCompleted: Math.random() > 0.6,
          position: itemPositions[j],
        })
      }
    }
    if (checklistItemsData.length > 0) await db.insert(schema.checklistItems).values(checklistItemsData)
  }

  console.log('--- Seeding complete! ---')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
