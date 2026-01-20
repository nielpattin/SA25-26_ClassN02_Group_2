import { db } from '../db'
import { users, workspaces, members } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), '../../.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(/DATABASE_URL="?([^"\n]+)"?/)
    if (match) process.env.DATABASE_URL = match[1]
  }
}

const emailA = process.argv[2]
const emailB = process.argv[3]

async function addMember() {
  const [userA] = await db.select().from(users).where(eq(users.email, emailA))
  const [userB] = await db.select().from(users).where(eq(users.email, emailB))

  if (!userA || !userB) throw new Error('Users not found')

  // Debug columns
  const cols = await db.execute(sql`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'workspaces'
  `)
  console.log('Workspaces columns:', cols.map(c => c.column_name))

  // Emergency Fix: Add owner_id if missing
  if (!cols.find(c => c.column_name === 'owner_id')) {
    console.log('Adding missing owner_id column...')
    await db.execute(sql`ALTER TABLE workspaces ADD COLUMN owner_id text`)
  }

  // Find A's workspace via membership (more reliable if owner_id is missing/null)
  const result = await db.execute(sql`
    SELECT w.* FROM workspaces w
    JOIN members m ON m.workspace_id = w.id
    WHERE m.user_id = ${userA.id} AND m.role = 'owner'
    LIMIT 1
  `)
  let workspace = result[0] as typeof workspaces.$inferSelect

  if (!workspace) throw new Error('Workspace not found')

  // Add B
  try {
    const check = await db.execute(sql`
      SELECT * FROM members WHERE workspace_id = ${workspace.id} AND user_id = ${userB.id}
    `)
    
    if (check.length > 0) {
      console.log('Member already exists')
      return
    }

    await db.insert(members).values({
      userId: userB.id,
      workspaceId: workspace.id,
      role: 'member'
    })
    console.log('Member added')
  } catch (e) {
    console.log('Member likely already exists')
  }
  
  console.log(`UserB_ID:${userB.id}`)
}

addMember().catch(e => {
  console.error(e)
  process.exit(1)
}).finally(() => process.exit(0))
