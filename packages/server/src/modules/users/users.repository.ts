import { db } from '../../db'
import { users } from '../../db/schema'
import { eq } from 'drizzle-orm'
import type { CreateUserInput, UpdateUserInput, UpdateUserPreferencesInput } from './users.model'

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

  async delete(id: string) {
    const [user] = await db.delete(users).where(eq(users.id, id)).returning()
    return user
  },
}
