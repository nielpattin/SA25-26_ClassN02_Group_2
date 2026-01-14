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

async function seed() {
  console.log('--- Seeding database ---')

  let userId: string

  try {
    console.log('Ensuring test user exists...')
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: TEST_USER.email,
        password: TEST_USER.password,
        name: TEST_USER.name,
      },
    })
    
    if (signUpResult && 'user' in signUpResult) {
      userId = signUpResult.user.id
      console.log('Created new test user:', userId)
    } else {
      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, TEST_USER.email),
      })
      if (!existingUser) throw new Error('Failed to create or find test user')
      userId = existingUser.id
      console.log('Found existing test user:', userId)
    }
  } catch (error) {
    console.log('User might already exist, searching...')
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, TEST_USER.email),
    })
    if (!existingUser) {
      console.error('Failed to ensure test user:', error)
      return
    }
    userId = existingUser.id
    console.log('Found existing test user:', userId)
  }

  // 1. Create Organization
  console.log('Creating organization...')
  const [org] = await db.insert(schema.organizations).values({
    name: 'Seed Workspace',
    slug: `seed-workspace-${Date.now()}`,
    personal: true,
  }).returning()

  await db.insert(schema.members).values({
    organizationId: org.id,
    userId: userId,
    role: 'owner',
  })

  // --- Helper for creating a board ---
  const createBoard = async (name: string, pos: string) => {
    const [board] = await db.insert(schema.boards).values({
      name,
      organizationId: org.id,
      ownerId: userId,
      position: pos,
      visibility: 'private',
    }).returning()

    await db.insert(schema.boardMembers).values({
      boardId: board.id,
      userId: userId,
      role: 'admin',
    })
    return board
  }

  const boardPositions = generatePositions(null, null, 2)

  // 2. Create Small Board
  console.log('Creating Small Board (2 cols, 3 cards each)...')
  const smallBoard = await createBoard('Small Board', boardPositions[0])
  
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
    for (let i = 0; i < 3; i++) {
      await db.insert(schema.tasks).values({
        title: `Simple Task ${i + 1} in ${col.name}`,
        columnId: col.id,
        position: taskPositions[i],
        priority: 'none',
      })
    }
  }

  // 3. Create Big Board
  console.log('Creating Big Board (10 cols, 15 cards each, detailed)...')
  const bigBoard = await createBoard('Big Board', boardPositions[1])

  // Labels for big board
  const labelData = [
    { name: 'Bug', color: '#e74c3c' },
    { name: 'Feature', color: '#2ecc71' },
    { name: 'UI/UX', color: '#9b59b6' },
    { name: 'Research', color: '#3498db' },
    { name: 'Important', color: '#f1c40f' },
    { name: 'Docs', color: '#34495e' },
  ]
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

  const priorities = ['low', 'medium', 'high', 'urgent', 'none'] as const

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
        dueDate: Math.random() > 0.3 ? new Date(Date.now() + Math.random() * 1000 * 60 * 60 * 24 * 14) : null, // 70% chance of due date within 2 weeks
      }).returning()

      // Labels (0-3)
      const numLabels = Math.floor(Math.random() * 4)
      if (numLabels > 0) {
        const shuffled = [...bigLabels].sort(() => 0.5 - Math.random())
        for (let j = 0; j < numLabels; j++) {
          await db.insert(schema.taskLabels).values({
            taskId: task.id,
            labelId: shuffled[j].id,
          })
        }
      }

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
  console.log(`User: ${TEST_USER.email}`)
  console.log(`Password: ${TEST_USER.password}`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
