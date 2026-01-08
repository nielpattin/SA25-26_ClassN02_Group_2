import { db } from '../../db'
import { tasks, columns, labels, cardLabels, checklists, checklistItems, attachments } from '../../db/schema'
import { eq, asc, sql, and } from 'drizzle-orm'

// Note: DB table is 'tasks' but API uses 'cards' (Kanban convention)
export const cardRepository = {
  findById: async (id: string) => {
    const [card] = await db.select().from(tasks).where(eq(tasks.id, id))
    return card
  },

  findByColumnId: (columnId: string) =>
    db.select().from(tasks).where(eq(tasks.columnId, columnId)).orderBy(asc(tasks.order)),

  create: async (data: { title: string; description?: string; order: number; columnId: string; dueDate?: Date | null }) => {
    const [card] = await db.insert(tasks).values(data).returning()
    return card
  },

  update: async (id: string, data: { title?: string; description?: string; order?: number; columnId?: string; dueDate?: Date | null }) => {
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

  getBoardIdFromCard: async (cardId: string): Promise<string | null> => {
    const [card] = await db.select({ columnId: tasks.columnId }).from(tasks).where(eq(tasks.id, cardId))
    if (!card || !card.columnId) return null
    return cardRepository.getBoardIdFromColumn(card.columnId)
  },

  findByBoardIdEnriched: async (boardId: string) => {
    // Get all columns for this board
    const boardColumns = await db.select({ id: columns.id })
      .from(columns)
      .where(eq(columns.boardId, boardId))

    const columnIds = boardColumns.map(c => c.id)
    if (columnIds.length === 0) return []

    // Get all cards for these columns
    const allCards = await db.select()
      .from(tasks)
      .where(sql`${tasks.columnId} IN ${columnIds}`)
      .orderBy(asc(tasks.order))

    if (allCards.length === 0) return []

    const cardIds = allCards.map(c => c.id)

    // Get labels for all cards
    const cardLabelResults = await db.select({
      cardId: cardLabels.cardId,
      labelId: labels.id,
      labelName: labels.name,
      labelColor: labels.color,
    })
      .from(cardLabels)
      .innerJoin(labels, eq(cardLabels.labelId, labels.id))
      .where(sql`${cardLabels.cardId} IN ${cardIds}`)

    // Get checklist progress for all cards
    const checklistProgress = await db.select({
      cardId: checklists.cardId,
      total: sql<number>`count(${checklistItems.id})::int`,
      completed: sql<number>`count(case when ${checklistItems.isCompleted} = true then 1 end)::int`,
    })
      .from(checklists)
      .leftJoin(checklistItems, eq(checklists.id, checklistItems.checklistId))
      .where(sql`${checklists.cardId} IN ${cardIds}`)
      .groupBy(checklists.cardId)

    // Get attachments count for all cards
    const attachmentCounts = await db.select({
      cardId: attachments.cardId,
      count: sql<number>`count(${attachments.id})::int`,
    })
      .from(attachments)
      .where(sql`${attachments.cardId} IN ${cardIds}`)
      .groupBy(attachments.cardId)

    // Build lookup maps
    const labelsMap: Record<string, { id: string; name: string; color: string }[]> = {}
    cardLabelResults.forEach(row => {
      if (!labelsMap[row.cardId]) labelsMap[row.cardId] = []
      labelsMap[row.cardId].push({ id: row.labelId, name: row.labelName, color: row.labelColor })
    })

    const progressMap: Record<string, { completed: number; total: number }> = {}
    checklistProgress.forEach(row => {
      if (row.total > 0) {
        progressMap[row.cardId] = { completed: row.completed, total: row.total }
      }
    })

    const attachmentsMap: Record<string, number> = {}
    attachmentCounts.forEach(row => {
      attachmentsMap[row.cardId] = row.count
    })

    // Combine all data
    return allCards.map(card => ({
      ...card,
      labels: labelsMap[card.id] || [],
      checklistProgress: progressMap[card.id] || null,
      attachmentsCount: attachmentsMap[card.id] || 0,
    }))
  },
}
