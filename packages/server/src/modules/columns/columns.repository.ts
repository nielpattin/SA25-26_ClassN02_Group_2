import { db } from '../../db'
import { columns } from '../../db/schema'
import { eq, asc, desc, and, isNull, isNotNull, sql } from 'drizzle-orm'
import { generatePositions } from '../../shared/position'
import { ConflictError, NotFoundError } from '../../shared/errors'

export const columnRepository = {
  findById: async (id: string) => {
    const [column] = await db.select().from(columns).where(eq(columns.id, id))
    return column
  },

  findByBoardId: (boardId: string) =>
    db.select().from(columns)
      .where(and(eq(columns.boardId, boardId), isNull(columns.archivedAt)))
      .orderBy(asc(columns.position)),

  findArchivedByBoardId: (boardId: string) =>
    db.select().from(columns)
      .where(and(eq(columns.boardId, boardId), isNotNull(columns.archivedAt)))
      .orderBy(desc(columns.archivedAt)),

  create: async (data: { name: string; position: string; boardId: string }) => {
    const [column] = await db.insert(columns).values(data).returning()
    return column
  },

  update: async (id: string, data: { name?: string; position?: string; boardId?: string; archivedAt?: Date | null }, expectedVersion?: number) => {
    const whereClause = expectedVersion
      ? and(eq(columns.id, id), eq(columns.version, expectedVersion))
      : eq(columns.id, id)

    const [column] = await db.update(columns).set({
      ...data,
      version: sql`${columns.version} + 1`
    }).where(whereClause).returning()

    if (!column && expectedVersion) {
      const existing = await db.select({ id: columns.id }).from(columns).where(eq(columns.id, id))
      if (existing.length > 0) {
        throw new ConflictError('Column has been modified by another user')
      }
      throw new NotFoundError('Column not found')
    }

    return column
  },

  archive: async (id: string) => {
    const [column] = await db.update(columns)
      .set({ archivedAt: new Date() })
      .where(eq(columns.id, id))
      .returning()
    return column
  },

  restore: async (id: string, position: string) => {
    const [column] = await db.update(columns)
      .set({ archivedAt: null, position })
      .where(eq(columns.id, id))
      .returning()
    return column
  },

  delete: async (id: string) => {
    const [column] = await db.delete(columns).where(eq(columns.id, id)).returning()
    return column
  },

  permanentDelete: async (id: string) => {
    const [column] = await db.delete(columns).where(eq(columns.id, id)).returning()
    return column
  },

  // Position helpers for fractional indexing
  getLastPositionInBoard: async (boardId: string): Promise<string | null> => {
    const [lastColumn] = await db.select({ position: columns.position })
      .from(columns)
      .where(and(eq(columns.boardId, boardId), isNull(columns.archivedAt)))
      .orderBy(desc(columns.position))
      .limit(1)
    return lastColumn?.position ?? null
  },

  getPositionBetween: async (
    boardId: string,
    beforeColumnId?: string,
    afterColumnId?: string
  ): Promise<{ before: string | null; after: string | null }> => {
    let before: string | null = null
    let after: string | null = null

    if (beforeColumnId) {
      const [beforeColumn] = await db.select({ position: columns.position })
        .from(columns)
        .where(eq(columns.id, beforeColumnId))
      before = beforeColumn?.position ?? null
    }

    if (afterColumnId) {
      const [afterColumn] = await db.select({ position: columns.position })
        .from(columns)
        .where(eq(columns.id, afterColumnId))
      after = afterColumn?.position ?? null
    }

    return { before, after }
  },

  rebalanceBoard: async (boardId: string): Promise<void> => {
    const boardColumns = await db.select({ id: columns.id })
      .from(columns)
      .where(and(eq(columns.boardId, boardId), isNull(columns.archivedAt)))
      .orderBy(asc(columns.position))

    if (boardColumns.length === 0) return

    const newPositions = generatePositions(null, null, boardColumns.length)

    for (let i = 0; i < boardColumns.length; i++) {
      await db.update(columns)
        .set({ position: newPositions[i] })
        .where(eq(columns.id, boardColumns[i].id))
    }
  },
}
