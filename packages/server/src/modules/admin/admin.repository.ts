import { db } from '../../db'
import { users, adminAuditLog, sessions, boardTemplates, members, boards, boardMembers, taskAssignees, workspaces } from '../../db/schema'
import { eq, and, isNotNull, count, desc, gte, lte, sql, or, like } from 'drizzle-orm'
import { AdminRole } from './admin.model'

export const adminRepository = {
  async findAdmins({ limit = 50, offset = 0 } = {}) {
    return await db.query.users.findMany({
      where: isNotNull(users.adminRole),
      limit,
      offset,
      orderBy: [desc(users.createdAt)]
    })
  },

  async updateRole(userId: string, role: AdminRole | null) {
    const [user] = await db.update(users)
      .set({ adminRole: role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    return user
  },

  async countSuperAdmins() {
    const [result] = await db.select({ value: count() })
      .from(users)
      .where(eq(users.adminRole, 'super_admin'))
    return result.value
  },

  async findById(id: string) {
    return await db.query.users.findFirst({
      where: eq(users.id, id)
    })
  },

  async findAuditLogs({
    adminId,
    action,
    targetType,
    targetId,
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0
  }: {
    adminId?: string
    action?: string
    targetType?: string
    targetId?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }) {
    const filters = []
    if (adminId) filters.push(eq(adminAuditLog.adminId, adminId))
    if (action) filters.push(eq(adminAuditLog.action, action))
    if (targetType) filters.push(eq(adminAuditLog.targetType, targetType))
    if (targetId) filters.push(eq(adminAuditLog.targetId, targetId))
    if (dateFrom) filters.push(gte(adminAuditLog.createdAt, dateFrom))
    if (dateTo) filters.push(lte(adminAuditLog.createdAt, dateTo))

    return await db.select({
      id: adminAuditLog.id,
      adminId: adminAuditLog.adminId,
      adminName: users.name,
      adminEmail: users.email,
      action: adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId: adminAuditLog.targetId,
      metadata: adminAuditLog.metadata,
      createdAt: adminAuditLog.createdAt
    })
      .from(adminAuditLog)
      .leftJoin(users, eq(adminAuditLog.adminId, users.id))
      .where(and(...filters))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(adminAuditLog.createdAt))
  },

  async exportAuditLogs(adminId?: string) {
    const filters = []
    if (adminId) filters.push(eq(adminAuditLog.adminId, adminId))

    return await db.select({
      id: adminAuditLog.id,
      adminId: adminAuditLog.adminId,
      adminName: users.name,
      adminEmail: users.email,
      action: adminAuditLog.action,
      targetType: adminAuditLog.targetType,
      targetId: adminAuditLog.targetId,
      metadata: adminAuditLog.metadata,
      createdAt: adminAuditLog.createdAt
    })
      .from(adminAuditLog)
      .leftJoin(users, eq(adminAuditLog.adminId, users.id))
      .where(and(...filters))
      .orderBy(desc(adminAuditLog.createdAt))
  },

  // Dashboard metrics queries
  async countActiveUsersLast24h(): Promise<number> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [result] = await db.select({ value: count(sql`DISTINCT ${sessions.userId}`) })
      .from(sessions)
      .where(gte(sessions.createdAt, twentyFourHoursAgo))
    return result.value
  },

  async countPendingModeration(): Promise<number> {
    const [result] = await db.select({ value: count() })
      .from(boardTemplates)
      .where(eq(boardTemplates.status, 'pending'))
    return result.value
  },

  async getRecentAdminActions(limit: number = 10) {
    return await db.select({
      action: adminAuditLog.action,
      createdAt: adminAuditLog.createdAt,
    })
      .from(adminAuditLog)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit)
  },

  async countTotalUsers(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(users)
    return result.value
  },

  async countTotalWorkspaces(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(workspaces)
    return result.value
  },

  async countTotalBoards(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(boards)
    return result.value
  },

  async getUserGrowthLast7Days() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return await db.select({
      date: sql<string>`TO_CHAR(${users.createdAt}, 'YYYY-MM-DD')`,
      count: count(),
    })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo))
      .groupBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM-DD')`)
  },

  async searchUsers({
    query,
    limit = 20,
    offset = 0,
  }: {
    query: string
    limit?: number
    offset?: number
  }) {
    const searchPattern = `%${query}%`

    return await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      adminRole: users.adminRole,
      deletedAt: users.deletedAt,
      lastActive: sql<string | null>`(
        SELECT MAX(${sessions.createdAt})
        FROM ${sessions}
        WHERE ${sessions.userId} = ${users.id}
      )`.as('lastActive'),
    })
      .from(users)
      .where(or(
        like(users.email, searchPattern),
        like(users.name, searchPattern),
        like(users.id, searchPattern),
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt))
  },

  async deleteAllSessions(userId: string) {
    return await db.delete(sessions).where(eq(sessions.userId, userId)).returning()
  },

  async getUserDetail(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) return null

    const [workspacesResult] = await db.select({ value: count() })
      .from(members)
      .where(eq(members.userId, userId))

    const [ownedBoardsResult] = await db.select({ value: count() })
      .from(boards)
      .where(eq(boards.ownerId, userId))

    const [memberBoardsResult] = await db.select({ value: count() })
      .from(boardMembers)
      .where(eq(boardMembers.userId, userId))

    const [lastActiveResult] = await db.select({
      lastActive: sql<string | null>`MAX(${sessions.createdAt})`,
    })
      .from(sessions)
      .where(eq(sessions.userId, userId))

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      deletedAt: user.deletedAt,
      adminRole: user.adminRole,
      workspacesCount: workspacesResult.value,
      boardsCount: ownedBoardsResult.value + memberBoardsResult.value,
      lastActive: lastActiveResult.lastActive,
    }
  },

  async cancelUserDeletion(userId: string) {
    const [user] = await db.update(users)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    return user
  },

  async getUserExportData(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })

    if (!user) return null

    const userWorkspaces = await db.select({
      workspaceId: members.workspaceId,
      role: members.role,
      joinedAt: members.createdAt,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
    })
      .from(members)
      .innerJoin(workspaces, eq(members.workspaceId, workspaces.id))
      .where(eq(members.userId, userId))

    const userBoards = await db.query.boards.findMany({
      where: eq(boards.ownerId, userId),
    })

    const memberBoardsList = await db.select({
      boardId: boardMembers.boardId,
      role: boardMembers.role,
      joinedAt: boardMembers.createdAt,
      boardName: boards.name,
    })
      .from(boardMembers)
      .innerJoin(boards, eq(boardMembers.boardId, boards.id))
      .where(eq(boardMembers.userId, userId))

    const [assignedTasksResult] = await db.select({ value: count() })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, userId))

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        locale: user.locale,
        timezone: user.timezone,
        theme: user.theme,
        adminRole: user.adminRole,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
      },
      workspaces: userWorkspaces.map(mw => ({
        id: mw.workspaceId,
        name: mw.workspaceName,
        slug: mw.workspaceSlug,
        role: mw.role,
        joinedAt: mw.joinedAt,
      })),
      ownedBoards: userBoards.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        visibility: b.visibility,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        archivedAt: b.archivedAt,
      })),
      memberBoards: memberBoardsList.map(mb => ({
        id: mb.boardId,
        name: mb.boardName,
        role: mb.role,
        joinedAt: mb.joinedAt,
      })),
      taskCount: assignedTasksResult.value,
    }
  },

  async countTotalUsers(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(users)
    return result.value
  },

  async countTotalWorkspaces(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(workspaces)
    return result.value
  },

  async countTotalBoards(): Promise<number> {
    const [result] = await db.select({ value: count() }).from(boards)
    return result.value
  },

  async getUserGrowthLast7Days() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return await db.select({
      date: sql<string>`TO_CHAR(${users.createdAt}, 'YYYY-MM-DD')`,
      count: count()
    })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo))
      .groupBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${users.createdAt}, 'YYYY-MM-DD')`)
  },

  // User search for support/super_admin
  async searchUsers({
    query,
    limit = 20,
    offset = 0
  }: {
    query: string
    limit?: number
    offset?: number
  }) {
    const searchPattern = `%${query}%`

    return await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      adminRole: users.adminRole,
      deletedAt: users.deletedAt,
      lastActive: sql<string | null>`(
        SELECT MAX(${sessions.createdAt})
        FROM ${sessions}
        WHERE ${sessions.userId} = ${users.id}
      )`.as('lastActive')
    })
      .from(users)
      .where(or(
        like(users.email, searchPattern),
        like(users.name, searchPattern),
        like(users.id, searchPattern)
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt))
  },

  // Delete all sessions for a user (used for admin session revocation)
  async deleteAllSessions(userId: string) {
    return await db.delete(sessions).where(eq(sessions.userId, userId)).returning()
  },

  // Get user detail with usage counts for support/super_admin
  async getUserDetail(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user) return null

    // Count workspaces
    const [workspacesResult] = await db.select({ value: count() })
      .from(members)
      .where(eq(members.userId, userId))

    // Count boards (boards where user is owner or member)
    const [ownedBoardsResult] = await db.select({ value: count() })
      .from(boards)
      .where(eq(boards.ownerId, userId))

    const [memberBoardsResult] = await db.select({ value: count() })
      .from(boardMembers)
      .where(eq(boardMembers.userId, userId))

    // Get last active from sessions
    const [lastActiveResult] = await db.select({
      lastActive: sql<string | null>`MAX(${sessions.createdAt})`
    })
      .from(sessions)
      .where(eq(sessions.userId, userId))

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      deletedAt: user.deletedAt,
      adminRole: user.adminRole,
      workspacesCount: workspacesResult.value,
      boardsCount: ownedBoardsResult.value + memberBoardsResult.value,
      lastActive: lastActiveResult.lastActive
    }
  },

  // Cancel user deletion (clear deletedAt)
  async cancelUserDeletion(userId: string) {
    const [user] = await db.update(users)
      .set({ deletedAt: null, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning()
    return user
  },

  // Get user data for export (super admin only)
  async getUserExportData(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    })

    if (!user) return null

    // Get user's workspaces with workspace details using join
    const userWorkspaces = await db.select({
      workspaceId: members.workspaceId,
      role: members.role,
      joinedAt: members.createdAt,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug
    })
      .from(members)
      .innerJoin(workspaces, eq(members.workspaceId, workspaces.id))
      .where(eq(members.userId, userId))

    // Get user's boards
    const userBoards = await db.query.boards.findMany({
      where: eq(boards.ownerId, userId)
    })

    // Get boards where user is a member using join
    const memberBoardsList = await db.select({
      boardId: boardMembers.boardId,
      role: boardMembers.role,
      joinedAt: boardMembers.createdAt,
      boardName: boards.name
    })
      .from(boardMembers)
      .innerJoin(boards, eq(boardMembers.boardId, boards.id))
      .where(eq(boardMembers.userId, userId))

    // Get count of tasks assigned to user
    const [assignedTasksResult] = await db.select({ value: count() })
      .from(taskAssignees)
      .where(eq(taskAssignees.userId, userId))

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        locale: user.locale,
        timezone: user.timezone,
        theme: user.theme,
        adminRole: user.adminRole,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt
      },
      workspaces: userWorkspaces.map(mw => ({
        id: mw.workspaceId,
        name: mw.workspaceName,
        slug: mw.workspaceSlug,
        role: mw.role,
        joinedAt: mw.joinedAt
      })),
      ownedBoards: userBoards.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description,
        visibility: b.visibility,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        archivedAt: b.archivedAt
      })),
      memberBoards: memberBoardsList.map(mb => ({
        id: mb.boardId,
        name: mb.boardName,
        role: mb.role,
        joinedAt: mb.joinedAt
      })),
      taskCount: assignedTasksResult.value
    }
  }
}
