import { db } from '../../db'
import { boardTemplates, taskTemplates, users } from '../../db/schema'
import { eq, and, or, ilike, sql, desc, asc, isNull, isNotNull, gt } from 'drizzle-orm'
import type { CreateBoardTemplateInput, UpdateBoardTemplateInput, CreateTaskTemplateInput, UpdateTaskTemplateInput, MarketplaceQuerySchema } from './templates.model'

export const templateRepository = {
  // Board Templates
  findMarketplaceTemplates: async (query: typeof MarketplaceQuerySchema.static) => {
    const { q, category, sort, limit = 20, offset = 0 } = query

    const conditions = [
      eq(boardTemplates.status, 'approved'),
      or(
        isNull(boardTemplates.takedownAt),
        gt(boardTemplates.takedownAt, new Date())
      )!
    ]

    if (q) {
      conditions.push(or(
        ilike(boardTemplates.name, `%${q}%`),
        ilike(boardTemplates.description, `%${q}%`)
      )!)
    }

    if (category) {
      conditions.push(sql`${boardTemplates.categories} @> ARRAY[${category}]`)
    }

    let orderBy = desc(boardTemplates.approvedAt)
    if (sort === 'popular') {
      orderBy = desc(boardTemplates.createdAt)
    } else if (sort === 'alphabetical') {
      orderBy = asc(boardTemplates.name)
    }

    return db.select({
      id: boardTemplates.id,
      name: boardTemplates.name,
      description: boardTemplates.description,
      categories: boardTemplates.categories,
      columnDefinitions: boardTemplates.columnDefinitions,
      defaultLabels: boardTemplates.defaultLabels,
      createdAt: boardTemplates.createdAt,
      approvedAt: boardTemplates.approvedAt,
      author: {
        id: users.id,
        name: users.name,
        image: users.image,
      },
    })
      .from(boardTemplates)
      .leftJoin(users, eq(boardTemplates.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(orderBy, asc(boardTemplates.id))
      .limit(limit)
      .offset(offset)
  },

  findMarketplaceTemplateById: async (id: string) => {
    const [template] = await db.select({
      id: boardTemplates.id,
      name: boardTemplates.name,
      description: boardTemplates.description,
      categories: boardTemplates.categories,
      columnDefinitions: boardTemplates.columnDefinitions,
      defaultLabels: boardTemplates.defaultLabels,
      createdAt: boardTemplates.createdAt,
      approvedAt: boardTemplates.approvedAt,
      author: {
        id: users.id,
        name: users.name,
        image: users.image,
      },
    })
      .from(boardTemplates)
      .leftJoin(users, eq(boardTemplates.createdBy, users.id))
      .where(and(
        eq(boardTemplates.id, id),
        eq(boardTemplates.status, 'approved'),
        or(
          isNull(boardTemplates.takedownAt),
          gt(boardTemplates.takedownAt, new Date())
        )!
      ))

    return template
  },

  findPendingSubmissions: async (filters?: { status?: string; category?: string }) => {
    const conditions = [eq(boardTemplates.status, 'pending')]

    if (filters?.status && filters.status !== 'pending') {
      // If a different status is explicitly requested, use it instead
      conditions.length = 0
      conditions.push(eq(boardTemplates.status, filters.status as 'none' | 'pending' | 'approved' | 'rejected'))
    }

    if (filters?.category) {
      conditions.push(sql`${boardTemplates.categories} @> ARRAY[${filters.category}]`)
    }

    return db.select({
      id: boardTemplates.id,
      name: boardTemplates.name,
      description: boardTemplates.description,
      categories: boardTemplates.categories,
      status: boardTemplates.status,
      submittedAt: boardTemplates.submittedAt,
      author: {
        id: users.id,
        name: users.name,
        image: users.image,
      },
    })
      .from(boardTemplates)
      .leftJoin(users, eq(boardTemplates.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(asc(boardTemplates.submittedAt))
  },

  findTakedownRequests: async () => {
    return db.select({
      id: boardTemplates.id,
      name: boardTemplates.name,
      description: boardTemplates.description,
      categories: boardTemplates.categories,
      status: boardTemplates.status,
      takedownRequestedAt: boardTemplates.takedownRequestedAt,
      takedownAt: boardTemplates.takedownAt,
      author: {
        id: users.id,
        name: users.name,
        image: users.image,
      },
    })
      .from(boardTemplates)
      .leftJoin(users, eq(boardTemplates.createdBy, users.id))
      .where(and(
        isNotNull(boardTemplates.takedownRequestedAt),
        or(
          isNull(boardTemplates.takedownAt),
          gt(boardTemplates.takedownAt, new Date())
        )!
      ))
      .orderBy(asc(boardTemplates.takedownAt))
  },

  findBoardTemplates: async (userId: string, workspaceId?: string) => {
    if (workspaceId) {
      return db.select().from(boardTemplates).where(
        or(
          eq(boardTemplates.createdBy, userId),
          and(eq(boardTemplates.workspaceId, workspaceId), eq(boardTemplates.isPublic, true))
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
