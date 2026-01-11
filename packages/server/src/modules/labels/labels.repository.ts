import { db } from '../../db'
import { labels, taskLabels } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import type { CreateLabelInput, UpdateLabelInput } from './labels.model'

export const labelRepository = {
  findByBoardId: async (boardId: string) => {
    return db.select().from(labels).where(eq(labels.boardId, boardId))
  },

  findById: async (id: string) => {
    const result = await db.select().from(labels).where(eq(labels.id, id))
    return result[0] || null
  },

  create: async (data: CreateLabelInput) => {
    const result = await db.insert(labels).values(data).returning()
    return result[0]
  },

  update: async (id: string, data: UpdateLabelInput) => {
    const result = await db.update(labels).set(data).where(eq(labels.id, id)).returning()
    return result[0]
  },

  delete: async (id: string) => {
    await db.delete(taskLabels).where(eq(taskLabels.labelId, id))
    const result = await db.delete(labels).where(eq(labels.id, id)).returning()
    return result[0]
  },

  addToTask: async (taskId: string, labelId: string) => {
    const result = await db.insert(taskLabels).values({ taskId, labelId }).returning()
    return result[0]
  },

  removeFromTask: async (taskId: string, labelId: string) => {
    const result = await db.delete(taskLabels)
      .where(and(eq(taskLabels.taskId, taskId), eq(taskLabels.labelId, labelId)))
      .returning()
    return result[0]
  },

  getTaskLabels: async (taskId: string) => {
    return db.select({ label: labels })
      .from(taskLabels)
      .innerJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(eq(taskLabels.taskId, taskId))
  }
}
