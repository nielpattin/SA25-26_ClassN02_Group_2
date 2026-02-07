import { adminRepository } from './admin.repository'
import { auditLogService, ADMIN_ACTIONS } from './auditLog.service'
import { AdminRole } from './admin.model'
import { BadRequestError, NotFoundError, ForbiddenError } from '../../shared/errors'

export const adminService = {
  async listAdmins(pagination: { limit?: number; offset?: number }) {
    return await adminRepository.findAdmins(pagination)
  },

  async promoteUser(adminId: string, targetUserId: string, role: AdminRole) {
    const targetUser = await adminRepository.findById(targetUserId)
    if (!targetUser) throw new NotFoundError('User not found')

    const updatedUser = await adminRepository.updateRole(targetUserId, role)

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.USER_PROMOTED,
      targetType: 'user',
      targetId: targetUserId,
      metadata: { role, previousRole: targetUser.adminRole }
    })

    return updatedUser
  },

  async demoteUser(adminId: string, targetUserId: string) {
    const targetUser = await adminRepository.findById(targetUserId)
    if (!targetUser) throw new NotFoundError('User not found')
    if (!targetUser.adminRole) throw new BadRequestError('User is not an admin')

    if (targetUser.adminRole === 'super_admin') {
      const superAdminCount = await adminRepository.countSuperAdmins()
      if (superAdminCount <= 1) {
        throw new BadRequestError('Cannot demote the last super admin')
      }
    }

    const updatedUser = await adminRepository.updateRole(targetUserId, null)

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.USER_DEMOTED,
      targetType: 'user',
      targetId: targetUserId,
      metadata: { previousRole: targetUser.adminRole }
    })

    return updatedUser
  },

  async getAuditLogs(
    adminId: string,
    adminRole: AdminRole,
    filters: {
      adminId?: string
      action?: string
      targetType?: string
      targetId?: string
      dateFrom?: string
      dateTo?: string
      limit?: number
      offset?: number
    }
  ) {
    const canSeeAll = adminRole === 'super_admin' || adminRole === 'moderator'
    const effectiveAdminId = canSeeAll ? filters.adminId : adminId

    return await adminRepository.findAuditLogs({
      ...filters,
      adminId: effectiveAdminId,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined
    })
  },

  async exportAuditLogs(adminId: string, adminRole: AdminRole) {
    if (adminRole !== 'super_admin') {
      throw new BadRequestError('Only super admin can export audit logs')
    }

    return await adminRepository.exportAuditLogs()
  },

  async getDashboardMetrics() {
    const [activeUsers24h, pendingModerationCount, recentAdminActions] = await Promise.all([
      adminRepository.countActiveUsersLast24h(),
      adminRepository.countPendingModeration(),
      adminRepository.getRecentAdminActions(10)
    ])

    return {
      activeUsers24h,
      pendingModerationCount,
      recentAdminActions: recentAdminActions.map(action => ({
        action: action.action,
        createdAt: action.createdAt.toISOString()
      }))
    }
  },

  async searchUsers(query: string, pagination: { limit?: number; offset?: number }) {
    const results = await adminRepository.searchUsers({
      query,
      limit: pagination.limit,
      offset: pagination.offset
    })

    return results.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      adminRole: user.adminRole,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      lastActive: user.lastActive ?? null
    }))
  },

  async getUserDetail(userId: string) {
    const user = await adminRepository.getUserDetail(userId)
    if (!user) throw new NotFoundError('User not found')

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      emailVerified: user.emailVerified,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      adminRole: user.adminRole,
      workspacesCount: user.workspacesCount,
      boardsCount: user.boardsCount,
      lastActive: user.lastActive ? new Date(user.lastActive).toISOString() : null
    }
  },

  async resetUserPassword(adminId: string, targetUserId: string) {
    const targetUser = await adminRepository.findById(targetUserId)
    if (!targetUser) throw new NotFoundError('User not found')

    if (targetUser.adminRole) {
      throw new ForbiddenError('Cannot reset password for admin users')
    }

    await adminRepository.deleteAllSessions(targetUserId)

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.USER_PASSWORD_RESET,
      targetType: 'user',
      targetId: targetUserId,
      metadata: { email: targetUser.email }
    })

    return { success: true }
  },

  async revokeUserSessions(adminId: string, targetUserId: string) {
    const targetUser = await adminRepository.findById(targetUserId)
    if (!targetUser) throw new NotFoundError('User not found')

    if (targetUser.adminRole) {
      throw new ForbiddenError('Cannot revoke sessions for admin users')
    }

    const revoked = await adminRepository.deleteAllSessions(targetUserId)

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.USER_SESSIONS_REVOKED,
      targetType: 'user',
      targetId: targetUserId,
      metadata: { email: targetUser.email, sessionCount: revoked.length }
    })

    return { success: true, count: revoked.length }
  },

  async cancelUserDeletion(adminId: string, targetUserId: string) {
    const targetUser = await adminRepository.findById(targetUserId)
    if (!targetUser) throw new NotFoundError('User not found')

    if (targetUser.adminRole) {
      throw new ForbiddenError('Cannot cancel deletion for admin users')
    }

    if (!targetUser.deletedAt) {
      throw new BadRequestError('User is not marked for deletion')
    }

    const updatedUser = await adminRepository.cancelUserDeletion(targetUserId)

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.USER_DELETION_CANCELED,
      targetType: 'user',
      targetId: targetUserId,
      metadata: { email: targetUser.email, previousDeletedAt: targetUser.deletedAt.toISOString() }
    })

    return { success: true, user: updatedUser }
  },

  async exportUserData(adminId: string, targetUserId: string) {
    const targetUser = await adminRepository.findById(targetUserId)
    if (!targetUser) throw new NotFoundError('User not found')

    const exportData = await adminRepository.getUserExportData(targetUserId)

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.USER_EXPORTED,
      targetType: 'user',
      targetId: targetUserId,
      metadata: { email: targetUser.email }
    })

    return { success: true, export: exportData }
  }
}
