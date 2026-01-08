import { db } from '../../db'
import { checklists, checklistItems } from '../../db/schema'
import { eq, max, asc } from 'drizzle-orm'
import type { CreateChecklistInput, UpdateChecklistInput, CreateChecklistItemInput, UpdateChecklistItemInput } from './checklists.model'

export const checklistRepository = {
  findByCardId: async (cardId: string) => {
    return db.select().from(checklists).where(eq(checklists.cardId, cardId)).orderBy(asc(checklists.order))
  },

  findById: async (id: string) => {
    const result = await db.select().from(checklists).where(eq(checklists.id, id))
    return result[0] || null
  },

  create: async (data: CreateChecklistInput) => {
    const maxOrderResult = await db
      .select({ maxOrder: max(checklists.order) })
      .from(checklists)
      .where(eq(checklists.cardId, data.cardId))
    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

    const result = await db.insert(checklists).values({
      ...data,
      order: nextOrder
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
    return db.select().from(checklistItems).where(eq(checklistItems.checklistId, checklistId)).orderBy(asc(checklistItems.order))
  },

  findItemById: async (id: string) => {
    const result = await db.select().from(checklistItems).where(eq(checklistItems.id, id))
    return result[0] || null
  },

  createItem: async (data: CreateChecklistItemInput) => {
    const maxOrderResult = await db
      .select({ maxOrder: max(checklistItems.order) })
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, data.checklistId))
    const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1

    const result = await db.insert(checklistItems).values({
      ...data,
      order: nextOrder,
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
