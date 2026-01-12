import { db } from '../../db'
import { checklists, checklistItems } from '../../db/schema'
import { eq, asc, desc } from 'drizzle-orm'
import type { CreateChecklistInput, UpdateChecklistInput, CreateChecklistItemInput, UpdateChecklistItemInput } from './checklists.model'
import { generatePosition } from '../../shared/position'

export const checklistRepository = {
  findByTaskId: async (taskId: string) => {
    return db.select().from(checklists).where(eq(checklists.taskId, taskId)).orderBy(asc(checklists.position))
  },

  findById: async (id: string) => {
    const result = await db.select().from(checklists).where(eq(checklists.id, id))
    return result[0] || null
  },

  // Position helpers
  getLastChecklistPosition: async (taskId: string): Promise<string | null> => {
    const [last] = await db.select({ position: checklists.position })
      .from(checklists)
      .where(eq(checklists.taskId, taskId))
      .orderBy(desc(checklists.position))
      .limit(1)
    return last?.position ?? null
  },

  getLastItemPosition: async (checklistId: string): Promise<string | null> => {
    const [last] = await db.select({ position: checklistItems.position })
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, checklistId))
      .orderBy(desc(checklistItems.position))
      .limit(1)
    return last?.position ?? null
  },

  create: async (data: CreateChecklistInput) => {
    // Get last position and generate next using fractional indexing
    const lastPosition = await checklistRepository.getLastChecklistPosition(data.taskId)
    const position = generatePosition(lastPosition, null)

    const result = await db.insert(checklists).values({
      ...data,
      position
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
    // Get last position and generate next using fractional indexing
    const lastPosition = await checklistRepository.getLastItemPosition(data.checklistId)
    const position = generatePosition(lastPosition, null)

    const result = await db.insert(checklistItems).values({
      ...data,
      position,
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
