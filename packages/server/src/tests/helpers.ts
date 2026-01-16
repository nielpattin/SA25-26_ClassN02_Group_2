import { db } from '../db'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'

export const TEST_USER_ID = '00000000-0000-4000-a000-000000000001'

/**
 * Get headers for authenticated requests in tests
 */
export const getAuthHeaders = (userId = TEST_USER_ID) => ({
  'Content-Type': 'application/json',
  'x-test-user-id': userId
})

/**
 * Ensure a test user exists in the database
 */
export async function ensureTestUser(id = TEST_USER_ID) {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.id, id)
  })

  if (!existing) {
    await db.insert(schema.users).values({
      id,
      name: 'Test User',
      email: `test-${id}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    console.log(`Created test user: ${id}`)
  }
  
  return id
}
