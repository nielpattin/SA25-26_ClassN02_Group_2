import { db } from '../../db'
import { boardTemplates, taskTemplates } from '../../db/schema'
import { eq, and, or } from 'drizzle-orm'
import type { CreateBoardTemplateInput, UpdateBoardTemplateInput, CreateTaskTemplateInput, UpdateTaskTemplateInput } from './templates.model'

export const templateRepository = {
  // Board Templates
  findBoardTemplates: async (userId: string, organizationId?: string) => {
    if (organizationId) {
      return db.select().from(boardTemplates).where(
        or(
          eq(boardTemplates.createdBy, userId),
          and(eq(boardTemplates.organizationId, organizationId), eq(boardTemplates.isPublic, true))
        )
      )
    }
    return db.select().from(boardTemplates).where(eq(boardTemplates.createdBy, userId))
  },

  findBoardTemplateById: async (id: string) => {
    const [template] = await db.select().from(boardTemplates).where(eq(boardTemplates.id, id))
    return template
  },

  createBoardTemplate: async (data: CreateBoardTemplateInput & { createdBy: string }) => {
    const [template] = await db.insert(boardTemplates).values(data).returning()
    return template
  },

  updateBoardTemplate: async (id: string, data: UpdateBoardTemplateInput) => {
    const [template] = await db.update(boardTemplates).set(data).where(eq(boardTemplates.id, id)).returning()
    return template
  },

  deleteBoardTemplate: async (id: string) => {
    const [template] = await db.delete(boardTemplates).where(eq(boardTemplates.id, id)).returning()
    return template
  },

  // Task Templates
  findTaskTemplatesByBoardId: async (boardId: string) => {
    return db.select().from(taskTemplates).where(eq(taskTemplates.boardId, boardId))
  },

  findTaskTemplateById: async (id: string) => {
    const [template] = await db.select().from(taskTemplates).where(eq(taskTemplates.id, id))
    return template
  },

  createTaskTemplate: async (data: CreateTaskTemplateInput & { createdBy: string }) => {
    const [template] = await db.insert(taskTemplates).values(data).returning()
    return template
  },

  updateTaskTemplate: async (id: string, data: UpdateTaskTemplateInput) => {
    const [template] = await db.update(taskTemplates).set(data).where(eq(taskTemplates.id, id)).returning()
    return template
  },

  deleteTaskTemplate: async (id: string) => {
    const [template] = await db.delete(taskTemplates).where(eq(taskTemplates.id, id)).returning()
    return template
  },
}
