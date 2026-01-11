import { db } from '../../db'
import { columns } from '../../db/schema'
import { eq, asc, sql } from 'drizzle-orm'

export const columnRepository = {
  findByBoardId: (boardId: string) =>
    db.select().from(columns).where(eq(columns.boardId, boardId)).orderBy(asc(columns.position)),

  create: async (data: { name: string; position: string; boardId: string }) => {
    const [column] = await db.insert(columns).values(data).returning()
    return column
  },

  update: async (id: string, data: { name?: string; position?: string }) => {
    const [column] = await db.update(columns).set(data).where(eq(columns.id, id)).returning()
    return column
  },

  delete: async (id: string) => {
    const [column] = await db.delete(columns).where(eq(columns.id, id)).returning()
    return column
  },

  getNextPosition: async (boardId: string) => {
    const [maxPos] = await db
      .select({ maxPos: sql<string>`COALESCE(MAX(${columns.position}), '0')` })
      .from(columns)
      .where(eq(columns.boardId, boardId))
    return String(Number(maxPos?.maxPos || '0') + 1)
  },
}
