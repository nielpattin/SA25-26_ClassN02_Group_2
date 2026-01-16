import { db } from '../db'
import { idempotencyKeys } from '../db/schema'
import { eq, and, lt } from 'drizzle-orm'

export const idempotencyRepository = {
  find: async (userId: string, key: string) => {
    const [record] = await db
      .select()
      .from(idempotencyKeys)
      .where(and(
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.key, key)
      ))
      .limit(1)
    
    return record
  },

  create: async (userId: string, key: string, requestHash: string) => {
    const [record] = await db
      .insert(idempotencyKeys)
      .values({
        userId,
        key,
        requestHash,
        status: 'pending',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .onConflictDoNothing()
      .returning()
    
    return record || null
  },

  resolve: async (userId: string, key: string, status: number, body: unknown) => {
    await db
      .update(idempotencyKeys)
      .set({
        status: 'completed',
        responseStatus: status,
        responseBody: body,
      })
      .where(and(
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.key, key)
      ))
  },

  purge: async (userId: string, key: string) => {
    await db
      .delete(idempotencyKeys)
      .where(and(
        eq(idempotencyKeys.userId, userId),
        eq(idempotencyKeys.key, key)
      ))
  },

  cleanup: async () => {
    await db
      .delete(idempotencyKeys)
      .where(lt(idempotencyKeys.expiresAt, new Date()))
  }
}
