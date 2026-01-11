import { db } from '../../db'
import { checklists, checklistItems } from '../../db/schema'
import { eq, asc, sql } from 'drizzle-orm'
import type { CreateChecklistInput, UpdateChecklistInput, CreateChecklistItemInput, UpdateChecklistItemInput } from './checklists.model'

export const checklistRepository = {
  findByTaskId: async (taskId: string) => {
    return db.select().from(checklists).where(eq(checklists.taskId, taskId)).orderBy(asc(checklists.position))
  },

  findById: async (id: string) => {
    const result = await db.select().from(checklists).where(eq(checklists.id, id))
    return result[0] || null
  },

  create: async (data: CreateChecklistInput) => {
    // Get next position using fractional indexing
    const [maxPos] = await db
      .select({ maxPos: sql<string>`COALESCE(MAX(${checklists.position}), '0')` })
      .from(checklists)
      .where(eq(checklists.taskId, data.taskId))
    const nextPosition = String(Number(maxPos?.maxPos || '0') + 1)

    const result = await db.insert(checklists).values({
      ...data,
      position: nextPosition
    }).returning()
    return result[0]
  },

  update: async (id: string, data: UpdateChecklistInput) => {
    const result = await db.update(checklists).set(data).where(eq(checklists.id, id)).returning()
    return result[0]
  },

  delete: async (id: string) => {
    await db.delete(checklistItems).where(eq(checklistItems.checklistId, id))
    const result = await db.delete(checklists).where(eq(checklists.id, id)).returning()
    return result[0]
  },

  // Checklist Items
  findItemsByChecklistId: async (checklistId: string) => {
    return db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklistId)).orderBy(asc(checklistItems.position))
  },

  findItemById: async (id: string) => {
    const result = await db.select().from(checklistItems).where(eq(checklistItems.id, id))
    return result[0] || null
  },

  createItem: async (data: CreateChecklistItemInput) => {
    // Get next position using fractional indexing
    const [maxPos] = await db
      .select({ maxPos: sql<string>`COALESCE(MAX(${checklistItems.position}), '0')` })
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, data.checklistId))
    const nextPosition = String(Number(maxPos?.maxPos || '0') + 1)

    const result = await db.insert(checklistItems).values({
      ...data,
      position: nextPosition,
      isCompleted: false
    }).returning()
    return result[0]
  },

  updateItem: async (id: string, data: UpdateChecklistItemInput) => {
    const result = await db.update(checklistItems).set(data).where(eq(checklistItems.id, id)).returning()
    return result[0]
  },

  deleteItem: async (id: string) => {
    const result = await db.delete(checklistItems).where(eq(checklistItems.id, id)).returning()
    return result[0]
  }
}
