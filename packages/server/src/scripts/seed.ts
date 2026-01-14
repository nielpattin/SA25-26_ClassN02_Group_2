/**
 * Seed script for development
 * Creates a large test board with 10 columns and many cards
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
      // If sign up fails, try to find the user
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

  // 2. Create Board
  console.log('Creating big test board...')
  const boardPositions = generatePositions(null, null, 1)
  const [board] = await db.insert(schema.boards).values({
    name: 'Big Test Board',
    organizationId: org.id,
    ownerId: userId,
    position: boardPositions[0],
    visibility: 'private',
  }).returning()

  await db.insert(schema.boardMembers).values({
    boardId: board.id,
    userId: userId,
    role: 'admin',
  })

  // 3. Create Labels
  console.log('Creating labels...')
  const labelData = [
    { name: 'Bug', color: '#e74c3c' },
    { name: 'Feature', color: '#2ecc71' },
    { name: 'UI/UX', color: '#9b59b6' },
    { name: 'Research', color: '#3498db' },
    { name: 'Important', color: '#f1c40f' },
    { name: 'Docs', color: '#34495e' },
  ]
  const createdLabels = await db.insert(schema.labels).values(
    labelData.map(l => ({ ...l, boardId: board.id }))
  ).returning()

  // 4. Create 10 Columns
  console.log('Creating 10 columns...')
  const columnNames = [
    'Backlog', 'Ready to Start', 'Research', 'Planning', 
    'In Progress', 'Blocked', 'Code Review', 'Testing', 
    'QA', 'Done'
  ]
  const columnPositions = generatePositions(null, null, columnNames.length)
  const createdColumns = await db.insert(schema.columns).values(
    columnNames.map((name, i) => ({
      name,
      boardId: board.id,
      position: columnPositions[i],
    }))
  ).returning()

  // 5. Create Tasks for each column
  console.log('Creating tasks (2-11 per column)...')
  for (const column of createdColumns) {
    // Range 2 to 11 cards
    const taskCount = Math.floor(Math.random() * (11 - 2 + 1)) + 2
    const taskPositions = generatePositions(null, null, taskCount)
    
    console.log(`  - Adding ${taskCount} tasks to column: ${column.name}`)
    
    for (let i = 0; i < taskCount; i++) {
      const [task] = await db.insert(schema.tasks).values({
        title: `Task ${column.name} - ${i + 1}`,
        columnId: column.id,
        position: taskPositions[i],
        priority: ['low', 'medium', 'high', 'urgent', 'none'][Math.floor(Math.random() * 5)] as any,
        description: null,
        dueDate: null,
        coverImageUrl: null,
      }).returning()

      // Randomly assign 0-3 labels
      const numLabels = Math.floor(Math.random() * 4)
      if (numLabels > 0) {
        const shuffledLabels = [...createdLabels].sort(() => 0.5 - Math.random())
        const labelsToAssign = shuffledLabels.slice(0, numLabels)
        
        for (const label of labelsToAssign) {
          await db.insert(schema.taskLabels).values({
            taskId: task.id,
            labelId: label.id,
          })
        }
      }

      // Randomly add a checklist (50% chance)
      if (Math.random() > 0.5) {
        const [checklist] = await db.insert(schema.checklists).values({
          taskId: task.id,
          title: 'Checklist',
          position: 'a',
        }).returning()

        const numItems = Math.floor(Math.random() * 4) + 2 // 2-5 items
        const itemPositions = generatePositions(null, null, numItems)
        
        for (let j = 0; j < numItems; j++) {
          await db.insert(schema.checklistItems).values({
            checklistId: checklist.id,
            content: `Step ${j + 1} for ${task.title}`,
            isCompleted: Math.random() > 0.7,
            position: itemPositions[j],
          })
        }
      }
    }
  }

  console.log('--- Seeding complete! ---')
  console.log(`User: ${TEST_USER.email}`)
  console.log(`Password: ${TEST_USER.password}`)
  console.log(`Board: ${board.name}`)
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
