import { db } from '../../db'
import { boards, boardMembers, starredBoards, boardVisits, users, members, workspaces, columns, tasks, labels, taskLabels, taskAssignees, checklists, checklistItems, attachments, comments, activities } from '../../db/schema'
import { eq, sql, and, isNull, isNotNull, or, inArray, desc } from 'drizzle-orm'
import { ConflictError, NotFoundError } from '../../shared/errors'

export const boardRepository = {
  findAll: () => db.select().from(boards).where(isNull(boards.archivedAt)),

  /** Find boards accessible to user (via workspace membership or board membership) */
  findByUserId: async (userId: string) => {
    // Get user's workspace IDs
    const userWorkspaces = await db.select({ workspaceId: members.workspaceId })
      .from(members)
      .where(eq(members.userId, userId))

    const workspaceIds = userWorkspaces.map(o => o.workspaceId)

    if (workspaceIds.length === 0) {
      return []
    }

    // Get boards in user's workspaces
    return db.select().from(boards)
      .where(and(
        inArray(boards.workspaceId, workspaceIds),
        isNull(boards.archivedAt)
      ))
  },

  findById: async (id: string) => {
    const [board] = await db.select().from(boards).where(eq(boards.id, id))
    return board
  },

  findByWorkspaceId: (workspaceId: string) =>
    db.select().from(boards)
      .where(and(eq(boards.workspaceId, workspaceId), isNull(boards.archivedAt))),

  findArchivedByWorkspaceId: (workspaceId: string) =>
    db.select().from(boards)
      .where(and(eq(boards.workspaceId, workspaceId), isNotNull(boards.archivedAt)))
      .orderBy(desc(boards.archivedAt)),

  create: async (data: {
    name: string
    description?: string
    workspaceId?: string
    ownerId?: string
    visibility?: 'private' | 'workspace' | 'public'
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
    visibility?: 'private' | 'workspace' | 'public'
    position?: string
  }, expectedVersion?: number) => {
    const whereClause = expectedVersion
      ? and(eq(boards.id, id), eq(boards.version, expectedVersion))
      : eq(boards.id, id)

    const [board] = await db.update(boards).set({
      ...data,
      version: sql`${boards.version} + 1`,
      updatedAt: new Date(),
    }).where(whereClause).returning()

    if (!board && expectedVersion) {
      const existing = await db.select({ id: boards.id }).from(boards).where(eq(boards.id, id))
      if (existing.length > 0) {
        throw new ConflictError('Board has been modified by another user')
      }
      throw new NotFoundError('Board not found')
    }

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

  permanentDelete: async (id: string) => {
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

  // Recent Boards (board visits)
  getRecentBoards: async (userId: string, limit = 5) => {
    return db.select({
      id: boards.id,
      name: boards.name,
      description: boards.description,
      visitedAt: boardVisits.visitedAt,
    })
      .from(boardVisits)
      .innerJoin(boards, eq(boardVisits.boardId, boards.id))
      .where(and(
        eq(boardVisits.userId, userId),
        isNull(boards.archivedAt)
      ))
      .orderBy(desc(boardVisits.visitedAt))
      .limit(limit)
  },

  recordVisit: async (userId: string, boardId: string) => {
    const [visit] = await db.insert(boardVisits)
      .values({
        userId,
        boardId,
        visitedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [boardVisits.userId, boardVisits.boardId],
        set: { visitedAt: new Date() },
      })
      .returning()
    return visit
  },

  getExportData: async (boardId: string, includeArchived: boolean = false) => {
    const board = await db.select().from(boards).where(eq(boards.id, boardId)).then(rows => rows[0])
    if (!board) return null

    const archivedFilter = (table: any) => includeArchived ? undefined : isNull(table.archivedAt)

    const [
      cols,
      tsks,
      lbls,
      tLabels,
      tAssignees,
      chklists,
      chkItems,
      attchments,
      cmments,
      acts,
    ] = await Promise.all([
      db.select().from(columns).where(and(eq(columns.boardId, boardId), archivedFilter(columns))),
      db.select().from(tasks).where(and(
        inArray(tasks.columnId, db.select({ id: columns.id }).from(columns).where(eq(columns.boardId, boardId))),
        archivedFilter(tasks)
      )),
      db.select().from(labels).where(eq(labels.boardId, boardId)),
      db.select().from(taskLabels).where(inArray(taskLabels.taskId,
        db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.columnId,
          db.select({ id: columns.id }).from(columns).where(eq(columns.boardId, boardId))
        ))
      )),
      db.select({
        taskId: taskAssignees.taskId,
        userId: taskAssignees.userId,
        assignedAt: taskAssignees.assignedAt,
        assignedBy: taskAssignees.assignedBy,
        userName: users.name,
        userEmail: users.email,
      })
        .from(taskAssignees)
        .leftJoin(users, eq(taskAssignees.userId, users.id))
        .where(inArray(taskAssignees.taskId,
          db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.columnId,
            db.select({ id: columns.id }).from(columns).where(eq(columns.boardId, boardId))
          ))
        )),
      db.select().from(checklists).where(inArray(checklists.taskId,
        db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.columnId,
          db.select({ id: columns.id }).from(columns).where(eq(columns.boardId, boardId))
        ))
      )),
      db.select().from(checklistItems).where(inArray(checklistItems.checklistId,
        db.select({ id: checklists.id }).from(checklists).where(inArray(checklists.taskId,
          db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.columnId,
            db.select({ id: columns.id }).from(columns).where(eq(columns.boardId, boardId))
          ))
        ))
      )),
      db.select().from(attachments).where(inArray(attachments.taskId,
        db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.columnId,
          db.select({ id: columns.id }).from(columns).where(eq(columns.boardId, boardId))
        ))
      )),
      db.select({
        id: comments.id,
        taskId: comments.taskId,
        userId: comments.userId,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        userName: users.name,
        userEmail: users.email,
      })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(inArray(comments.taskId,
          db.select({ id: tasks.id }).from(tasks).where(inArray(tasks.columnId,
            db.select({ id: columns.id }).from(columns).where(eq(columns.boardId, boardId))
          ))
        )),
      db.select().from(activities).where(eq(activities.boardId, boardId)),
    ])

    return {
      board,
      columns: cols,
      tasks: tsks,
      labels: lbls,
      taskLabels: tLabels,
      taskAssignees: tAssignees,
      checklists: chklists,
      checklistItems: chkItems,
      attachments: attchments,
      comments: cmments,
      activities: acts,
    }
  },
}
