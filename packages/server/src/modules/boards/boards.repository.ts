import { db } from '../../db'
import { boards } from '../../db/schema'
import { eq } from 'drizzle-orm'

export const boardRepository = {
  findAll: () => db.select().from(boards),

  findById: async (id: string) => {
    const [board] = await db.select().from(boards).where(eq(boards.id, id))
    return board
  },

  create: async (data: { name: string }) => {
    const [board] = await db.insert(boards).values(data).returning()
    return board
  },

  update: async (id: string, data: { name?: string }) => {
    const [board] = await db.update(boards).set(data).where(eq(boards.id, id)).returning()
    return board
  },

  delete: async (id: string) => {
    const [board] = await db.delete(boards).where(eq(boards.id, id)).returning()
    return board
  },
}
