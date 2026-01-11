import { db } from '../../db'
import { notifications } from '../../db/schema'
import { eq, and, desc } from 'drizzle-orm'
import type { CreateNotificationInputType } from './notifications.model'

export const notificationRepository = {
  findByUserId: async (userId: string, limit = 50) => {
    return db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
  },

  findUnreadByUserId: async (userId: string) => {
    return db.select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
      .orderBy(desc(notifications.createdAt))
  },

  countUnread: async (userId: string) => {
    const result = await db.select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    return result.length
  },

  create: async (data: CreateNotificationInputType) => {
    const [notification] = await db.insert(notifications).values(data).returning()
    return notification
  },

  markAsRead: async (id: string) => {
    const [notification] = await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id))
      .returning()
    return notification
  },

  markAllAsRead: async (userId: string) => {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId))
  },

  delete: async (id: string) => {
    const [notification] = await db.delete(notifications)
      .where(eq(notifications.id, id))
      .returning()
    return notification
  },
}
