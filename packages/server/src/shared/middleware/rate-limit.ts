import { db } from '../../db'
import { rateLimits } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { RateLimitError } from '../errors'

export async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - windowMs)

  const [record] = await db.select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1)

  if (!record) {
    await db.insert(rateLimits).values({
      key,
      count: 1,
      lastResetAt: now,
    })
    return
  }

  if (record.lastResetAt < windowStart) {
    await db.update(rateLimits)
      .set({
        count: 1,
        lastResetAt: now,
      })
      .where(eq(rateLimits.key, key))
    return
  }

  if (record.count >= limit) {
    throw new RateLimitError('Rate limit exceeded. Please wait an hour before trying again.')
  }

  await db.update(rateLimits)
    .set({
      count: record.count + 1,
    })
    .where(eq(rateLimits.key, key))
}
