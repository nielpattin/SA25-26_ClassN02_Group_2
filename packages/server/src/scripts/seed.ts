/**
 * Seed script for development
 * Creates two test boards:
 * - Small Board: 2 columns, 3 cards each (simple)
 * - Big Board: 10 columns, 15 cards each (detailed)
 *
 * Run: bun run src/scripts/seed.ts
 */
import { auth } from '../modules/auth/auth'
import { db } from '../db'
import * as schema from '../db/schema'
import { generatePositions } from '../shared/position'
import { eq } from 'drizzle-orm'

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
      console.log(`Created new test user: ${userData.email} (${signUpResult.user.id})`)
      return signUpResult.user.id
    }
  } catch (error) {
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
  
  // Delete in order to satisfy foreign key constraints
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
    schema.starredBoards,
    schema.tasks,
    schema.columns,
    schema.labels,
    schema.boardMembers,
    schema.boards,
    schema.members,
    schema.organizations,
    schema.sessions,
    schema.accounts,
    schema.verifications,
    schema.users,
  ]

  for (const table of tables) {
    await db.delete(table)
  }
}

async function seed() {
  console.log('--- Seeding database ---')

  await cleanDatabase()

  const ownerId = await ensureUserExists(TEST_USER)
  const otherUserIds: string[] = []
  
  for (const userData of ADDITIONAL_USERS) {
    const id = await ensureUserExists(userData)
    otherUserIds.push(id)
  }

  const allUserIds = [ownerId, ...otherUserIds]

  // 1. Create Organization
  console.log('Creating organization...')
  const [org] = await db.insert(schema.organizations).values({
    name: 'Seed Workspace',
    slug: `seed-workspace-${Date.now()}`,
    personal: true,
  }).returning()

  await db.insert(schema.members).values(
    allUserIds.map((id, index) => ({
      organizationId: org.id,
      userId: id,
      role: (index === 0 ? 'owner' : 'member') as 'owner' | 'member',
    }))
  )

  // --- Helper for creating a board ---
  const createBoard = async (name: string, pos: string) => {
    const [board] = await db.insert(schema.boards).values({
      name,
      organizationId: org.id,
      ownerId: ownerId,
      position: pos,
      visibility: 'private',
    }).returning()

    await db.insert(schema.boardMembers).values(
      allUserIds.map((id, index) => ({
        boardId: board.id,
        userId: id,
        role: (index === 0 ? 'admin' : 'member') as 'admin' | 'member',
      }))
    )
    return board
  }

  const boardPositions = generatePositions(null, null, 2)

  // Labels for both boards
  const labelData = [
    { name: 'Bug', color: '#e74c3c' },
    { name: 'Feature', color: '#2ecc71' },
    { name: 'UI/UX', color: '#9b59b6' },
    { name: 'Research', color: '#3498db' },
    { name: 'Important', color: '#f1c40f' },
    { name: 'Docs', color: '#34495e' },
  ]

  // 2. Create Small Board
  console.log('Creating Small Board (2 cols, 3 cards each)...')
  const smallBoard = await createBoard('Small Board', boardPositions[0])
  
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

  const priorities = ['low', 'medium', 'high', 'urgent', 'none'] as const

  const getRandomDate = () => {
    const dayOffset = Math.floor(Math.random() * 15) - 7 // -7 to +7 days
    return new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000)
  }

  const addRandomDataToTask = async (taskId: string, labels: typeof smallLabels) => {
    // Random Labels (0-3)
    const numLabels = Math.floor(Math.random() * 4)
    if (numLabels > 0) {
      const shuffled = [...labels].sort(() => 0.5 - Math.random())
      for (let j = 0; j < numLabels; j++) {
        await db.insert(schema.taskLabels).values({
          taskId: taskId,
          labelId: shuffled[j].id,
        })
      }
    }

    // Random Assignees (0-3)
    const numAssignees = Math.floor(Math.random() * 4)
    if (numAssignees > 0) {
      const shuffledUsers = [...allUserIds].sort(() => 0.5 - Math.random())
      for (let j = 0; j < numAssignees; j++) {
        await db.insert(schema.taskAssignees).values({
          taskId: taskId,
          userId: shuffledUsers[j],
          assignedBy: ownerId,
        })
      }
    }

    // Random Comments (0-3)
    const numComments = Math.floor(Math.random() * 4)
    for (let j = 0; j < numComments; j++) {
      await db.insert(schema.comments).values({
        taskId: taskId,
        userId: allUserIds[Math.floor(Math.random() * allUserIds.length)],
        content: COMMENTS_POOL[Math.floor(Math.random() * COMMENTS_POOL.length)],
      })
    }
  }

  for (const col of smallColumns) {
    const taskPositions = generatePositions(null, null, 3)
    for (let i = 0; i < 3; i++) {
      const [task] = await db.insert(schema.tasks).values({
        title: `Simple Task ${i + 1} in ${col.name}`,
        columnId: col.id,
        position: taskPositions[i],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        dueDate: Math.random() > 0.4 ? getRandomDate() : null,
      }).returning()
      
      await addRandomDataToTask(task.id, smallLabels)
    }
  }

  // 3. Create Big Board
  console.log('Creating Big Board (10 cols, 15 cards each, detailed)...')
  const bigBoard = await createBoard('Big Board', boardPositions[1])

  const bigLabels = await db.insert(schema.labels).values(
    labelData.map(l => ({ ...l, boardId: bigBoard.id }))
  ).returning()

  const bigColNames = [
    'Backlog', 'Analysis', 'Design', 'Ready', 'In Dev', 
    'Testing', 'Review', 'Staging', 'Prod', 'Done'
  ]
  const bigColPositions = generatePositions(null, null, 10)
  const bigColumns = await db.insert(schema.columns).values(
    bigColNames.map((name, i) => ({
      name,
      boardId: bigBoard.id,
      position: bigColPositions[i],
    }))
  ).returning()

  for (const col of bigColumns) {
    console.log(`  - Adding 15 tasks to column: ${col.name}`)
    const taskPositions = generatePositions(null, null, 15)
    
    for (let i = 0; i < 15; i++) {
      const [task] = await db.insert(schema.tasks).values({
        title: `Detailed Task ${i + 1} in ${col.name}`,
        description: `This is a detailed description for task ${i + 1}. It contains some random information to simulate a real-world task scenario on the big board.`,
        columnId: col.id,
        position: taskPositions[i],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        dueDate: Math.random() > 0.3 ? getRandomDate() : null,
      }).returning()

      await addRandomDataToTask(task.id, bigLabels)

      // Checklist (60% chance)
      if (Math.random() > 0.4) {
        const [checklist] = await db.insert(schema.checklists).values({
          taskId: task.id,
          title: 'Project Requirements',
          position: 'a',
        }).returning()

        const numItems = Math.floor(Math.random() * 5) + 2 // 2-6 items
        const itemPositions = generatePositions(null, null, numItems)
        for (let j = 0; j < numItems; j++) {
          await db.insert(schema.checklistItems).values({
            checklistId: checklist.id,
            content: `Requirement step ${j + 1}`,
            isCompleted: Math.random() > 0.6,
            position: itemPositions[j],
          })
        }
      }
    }
  }

  console.log('--- Seeding complete! ---')
  console.log('Test Users:')
  console.log(`Owner: ${TEST_USER.email} / ${TEST_USER.password}`)
  console.log(`Created 21 additional developers (dev1@kyte.dev to dev21@kyte.dev)`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
