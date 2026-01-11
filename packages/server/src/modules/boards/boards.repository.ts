import { db } from '../../db'
import { boards, boardMembers, starredBoards, users } from '../../db/schema'
import { eq, sql, and, isNull } from 'drizzle-orm'

export const boardRepository = {
  findAll: () => db.select().from(boards).where(isNull(boards.archivedAt)),

  findById: async (id: string) => {
    const [board] = await db.select().from(boards).where(eq(boards.id, id))
    return board
  },

  findByOrganizationId: (organizationId: string) =>
    db.select().from(boards)
      .where(and(eq(boards.organizationId, organizationId), isNull(boards.archivedAt))),

  create: async (data: {
    name: string
    description?: string
    organizationId?: string
    ownerId?: string
    visibility?: 'private' | 'organization' | 'public'
  }) => {
    const [maxPos] = await db.select({ maxPos: sql<string>`COALESCE(MAX(${boards.position}), '0')` }).from(boards)
    const nextPosition = String(Number(maxPos?.maxPos || '0') + 1)

    const [board] = await db.insert(boards).values({
      ...data,
      position: nextPosition,
    }).returning()
    return board
  },

  update: async (id: string, data: {
    name?: string
    description?: string
    visibility?: 'private' | 'organization' | 'public'
    position?: string
  }) => {
    const [board] = await db.update(boards).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(boards.id, id)).returning()
    return board
  },

  archive: async (id: string) => {
    const [board] = await db.update(boards).set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(boards.id, id)).returning()
    return board
  },

  restore: async (id: string) => {
    const [board] = await db.update(boards).set({
      archivedAt: null,
      updatedAt: new Date(),
    }).where(eq(boards.id, id)).returning()
    return board
  },

  delete: async (id: string) => {
    const [board] = await db.delete(boards).where(eq(boards.id, id)).returning()
    return board
  },

  // Board Members
  getMembers: async (boardId: string) => {
    return db.select({
      id: boardMembers.id,
      boardId: boardMembers.boardId,
      userId: boardMembers.userId,
      role: boardMembers.role,
      createdAt: boardMembers.createdAt,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
      .from(boardMembers)
      .leftJoin(users, eq(boardMembers.userId, users.id))
      .where(eq(boardMembers.boardId, boardId))
  },

  addMember: async (boardId: string, userId: string, role: 'admin' | 'member' | 'viewer' = 'member') => {
    const [member] = await db.insert(boardMembers).values({
      boardId,
      userId,
      role,
    }).returning()
    return member
  },

  updateMemberRole: async (id: string, role: 'admin' | 'member' | 'viewer') => {
    const [member] = await db.update(boardMembers).set({ role }).where(eq(boardMembers.id, id)).returning()
    return member
  },

  removeMember: async (boardId: string, userId: string) => {
    const [member] = await db.delete(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
      .returning()
    return member
  },

  // Starred Boards
  getStarredByUserId: async (userId: string) => {
    return db.select({
      boardId: starredBoards.boardId,
      boardName: boards.name,
      createdAt: starredBoards.createdAt,
    })
      .from(starredBoards)
      .innerJoin(boards, eq(starredBoards.boardId, boards.id))
      .where(eq(starredBoards.userId, userId))
  },

  star: async (userId: string, boardId: string) => {
    const [starred] = await db.insert(starredBoards).values({
      userId,
      boardId,
    }).returning()
    return starred
  },

  unstar: async (userId: string, boardId: string) => {
    const [starred] = await db.delete(starredBoards)
      .where(and(eq(starredBoards.userId, userId), eq(starredBoards.boardId, boardId)))
      .returning()
    return starred
  },

  isStarred: async (userId: string, boardId: string) => {
    const [result] = await db.select()
      .from(starredBoards)
      .where(and(eq(starredBoards.userId, userId), eq(starredBoards.boardId, boardId)))
    return !!result
  },
}
