import { db } from '../../db'
import { activities, users } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
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

  findByTaskId: async (taskId: string, limit = 50) => {
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
      .where(eq(activities.taskId, taskId))
      .orderBy(desc(activities.createdAt))
      .limit(limit)
  },

  create: async (data: CreateActivityInputType) => {
    const [activity] = await db.insert(activities).values(data).returning()
    return activity
  },
}
