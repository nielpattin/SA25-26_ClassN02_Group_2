import { db } from '../../db'
import { users, adminAuditLog } from '../../db/schema'
import { eq, and, isNotNull, count, desc, gte, lte } from 'drizzle-orm'
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
    dateFrom,
    dateTo,
    limit = 50,
    offset = 0
  }: {
    adminId?: string
    action?: string
    targetType?: string
    dateFrom?: Date
    dateTo?: Date
    limit?: number
    offset?: number
  }) {
    const filters = []
    if (adminId) filters.push(eq(adminAuditLog.adminId, adminId))
    if (action) filters.push(eq(adminAuditLog.action, action))
    if (targetType) filters.push(eq(adminAuditLog.targetType, targetType))
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
  }
}
