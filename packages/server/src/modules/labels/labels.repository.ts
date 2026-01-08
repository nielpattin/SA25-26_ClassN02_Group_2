import { db } from '../../db'
import { labels, cardLabels } from '../../db/schema'
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
    await db.delete(cardLabels).where(eq(cardLabels.labelId, id))
    const result = await db.delete(labels).where(eq(labels.id, id)).returning()
    return result[0]
  },

  addToCard: async (cardId: string, labelId: string) => {
    const result = await db.insert(cardLabels).values({ cardId, labelId }).returning()
    return result[0]
  },

  removeFromCard: async (cardId: string, labelId: string) => {
    const result = await db.delete(cardLabels)
      .where(and(eq(cardLabels.cardId, cardId), eq(cardLabels.labelId, labelId)))
      .returning()
    return result[0]
  },

  getCardLabels: async (cardId: string) => {
    return db.select({ label: labels })
      .from(cardLabels)
      .innerJoin(labels, eq(cardLabels.labelId, labels.id))
      .where(eq(cardLabels.cardId, cardId))
  }
}
