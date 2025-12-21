import { db } from '../../db'
import { tasks, columns } from '../../db/schema'
import { eq, asc } from 'drizzle-orm'

// Note: DB table is 'tasks' but API uses 'cards' (Kanban convention)
export const cardRepository = {
  findByColumnId: (columnId: string) =>
    db.select().from(tasks).where(eq(tasks.columnId, columnId)).orderBy(asc(tasks.order)),

  create: async (data: { title: string; description?: string; order: number; columnId: string }) => {
    const [card] = await db.insert(tasks).values(data).returning()
    return card
  },

  update: async (id: string, data: { title?: string; description?: string; order?: number; columnId?: string }) => {
    const [card] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning()
    return card
  },

  delete: async (id: string) => {
    const [card] = await db.delete(tasks).where(eq(tasks.id, id)).returning()
    return card
  },

  getBoardIdFromColumn: async (columnId: string): Promise<string | null> => {
    const [col] = await db.select({ boardId: columns.boardId }).from(columns).where(eq(columns.id, columnId))
    return col?.boardId ?? null
  },
}
