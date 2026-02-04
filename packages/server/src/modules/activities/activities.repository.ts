import { db } from '../../db'
import { activities, users } from '../../db/schema'
import { eq, desc, gt, lt, and, asc } from 'drizzle-orm'
import type { CreateActivityInputType } from './activities.model'

export const activityRepository = {
  findByBoardId: async (boardId: string, limit = 50) => {
    return db.select({
      id: activities.id,
      boardId: activities.boardId,
      taskId: activities.taskId,
      userId: activities.userId,
      action: activities.action,
      targetType: activities.targetType,
      targetId: activities.targetId,
      changes: activities.changes,
      createdAt: activities.createdAt,
      userName: users.name,
      userImage: users.image,
    })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(eq(activities.boardId, boardId))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
  },

  findByBoardIdSince: async (boardId: string, since: Date, limit = 100) => {
    return db.select({
      id: activities.id,
      boardId: activities.boardId,
      taskId: activities.taskId,
      userId: activities.userId,
      action: activities.action,
      targetType: activities.targetType,
      targetId: activities.targetId,
      changes: activities.changes,
      createdAt: activities.createdAt,
      userName: users.name,
      userImage: users.image,
    })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(and(
        eq(activities.boardId, boardId),
        gt(activities.createdAt, since)
      ))
      .orderBy(asc(activities.createdAt))
      .limit(limit)
  },

  findByTaskId: async (taskId: string, limit = 50, cursor?: string) => {
    const conditions = [eq(activities.taskId, taskId)]

    if (cursor) {
      conditions.push(lt(activities.createdAt, new Date(cursor)))
    }

    return db.select({
      id: activities.id,
      boardId: activities.boardId,
      taskId: activities.taskId,
      userId: activities.userId,
      action: activities.action,
      targetType: activities.targetType,
      targetId: activities.targetId,
      changes: activities.changes,
      createdAt: activities.createdAt,
      userName: users.name,
      userImage: users.image,
    })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
  },

  create: async (data: CreateActivityInputType) => {
    const [activity] = await db.insert(activities).values(data).returning()
    return activity
  },

  findByBoardIdInRange: async (boardId: string, dateFrom: Date, dateTo: Date) => {
    return db.select({
      id: activities.id,
      boardId: activities.boardId,
      taskId: activities.taskId,
      userId: activities.userId,
      action: activities.action,
      targetType: activities.targetType,
      targetId: activities.targetId,
      changes: activities.changes,
      createdAt: activities.createdAt,
      userName: users.name,
      userImage: users.image,
    })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(and(
        eq(activities.boardId, boardId),
        gt(activities.createdAt, dateFrom),
        lt(activities.createdAt, dateTo)
      ))
      .orderBy(asc(activities.createdAt))
  },

  // Streaming version for large exports - yields activities in batches
  streamByBoardIdInRange: async function* (boardId: string, dateFrom: Date, dateTo: Date, batchSize = 1000) {
    let offset = 0
    let hasMore = true

    while (hasMore) {
      const batch = await db.select({
        id: activities.id,
        boardId: activities.boardId,
        taskId: activities.taskId,
        userId: activities.userId,
        action: activities.action,
        targetType: activities.targetType,
        targetId: activities.targetId,
        changes: activities.changes,
        createdAt: activities.createdAt,
        userName: users.name,
        userImage: users.image,
      })
        .from(activities)
        .leftJoin(users, eq(activities.userId, users.id))
        .where(and(
          eq(activities.boardId, boardId),
          gt(activities.createdAt, dateFrom),
          lt(activities.createdAt, dateTo)
        ))
        .orderBy(asc(activities.createdAt))
        .limit(batchSize)
        .offset(offset)

      for (const activity of batch) {
        yield activity
      }

      hasMore = batch.length === batchSize
      offset += batch.length
    }
  },
}
