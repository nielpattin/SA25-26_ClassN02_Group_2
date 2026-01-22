import { db } from '../../db'
import { users, sessions, accounts } from '../../db/schema'
import { eq, and, ne } from 'drizzle-orm'
import type { CreateUserInput, UpdateUserInput, UpdateUserPreferencesInput, UpdateNotificationPreferencesInput } from './users.model'

export const userRepository = {
  async getAll() {
    return db.select().from(users)
  },

  async getById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user
  },

  async getByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    return user
  },

  async getPasswordHash(userId: string) {
    const [account] = await db.select().from(accounts).where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.providerId, 'credential')
      )
    )
    return account?.password
  },

  async create(data: CreateUserInput) {
    const [user] = await db.insert(users).values({
      id: data.id || crypto.randomUUID(),
      name: data.name,
      email: data.email,
      image: data.image,
    }).returning()
    return user
  },

  async update(id: string, data: UpdateUserInput) {
    const [user] = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return user
  },

  async updatePreferences(id: string, data: UpdateUserPreferencesInput) {
    const [user] = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return user
  },

  async updateNotificationPreferences(id: string, data: UpdateNotificationPreferencesInput) {
    const user = await this.getById(id)
    if (!user) return null

    const currentPrefs = user.notificationPreferences as any
    const newPrefs = { ...currentPrefs }

    for (const key in data) {
      if (data[key as keyof typeof data]) {
        newPrefs[key] = {
          ...currentPrefs[key],
          ...data[key as keyof typeof data]
        }
      }
    }

    const [updatedUser] = await db.update(users)
      .set({
        notificationPreferences: newPrefs,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return updatedUser
  },

  async delete(id: string) {
    // Soft delete
    const [user] = await db.update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return user
  },

  async getSessions(userId: string) {
    return db.select().from(sessions).where(eq(sessions.userId, userId))
  },

  async deleteSession(userId: string, sessionId: string) {
    return db.delete(sessions).where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.id, sessionId)
      )
    ).returning()
  },

  async deleteAllSessionsExcept(userId: string, currentSessionId: string) {
    return db.delete(sessions).where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.id, currentSessionId)
      )
    ).returning()
  },

  async deleteAllSessions(userId: string) {
    return db.delete(sessions).where(eq(sessions.userId, userId)).returning()
  },
}
