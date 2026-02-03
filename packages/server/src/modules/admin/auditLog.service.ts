import { db } from '../../db'
import { adminAuditLog } from '../../db/schema'

export const ADMIN_ACTIONS = {
  USER_PROMOTED: 'user.promoted',
  USER_DEMOTED: 'user.demoted',
  TEMPLATE_APPROVED: 'template.approved',
  TEMPLATE_REJECTED: 'template.rejected',
  TEMPLATE_REMOVED: 'template.removed',
  WORKSPACE_DELETED: 'workspace.deleted',
} as const

export type AdminAction = typeof ADMIN_ACTIONS[keyof typeof ADMIN_ACTIONS]

export const auditLogService = {
  async log({
    adminId,
    action,
    targetType,
    targetId,
    metadata
  }: {
    adminId: string
    action: string
    targetType: string
    targetId?: string
    metadata?: any
  }) {
    return await db.insert(adminAuditLog).values({
      adminId,
      action,
      targetType,
      targetId,
      metadata
    }).returning()
  }
}
