import { db } from '../../db'
import { columns } from '../../db/schema'
import { eq, asc } from 'drizzle-orm'

export const columnRepository = {
  findByBoardId: (boardId: string) =>
    db.select().from(columns).where(eq(columns.boardId, boardId)).orderBy(asc(columns.order)),

  create: async (data: { name: string; order: number; boardId: string }) => {
    const [column] = await db.insert(columns).values(data).returning()
    return column
  },

  update: async (id: string, data: { name?: string; order?: number }) => {
    const [column] = await db.update(columns).set(data).where(eq(columns.id, id)).returning()
    return column
  },

  delete: async (id: string) => {
    const [column] = await db.delete(columns).where(eq(columns.id, id)).returning()
    return column
  },
}
