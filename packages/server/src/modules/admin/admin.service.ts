import { adminRepository } from './admin.repository'
import { auditLogService, ADMIN_ACTIONS } from './auditLog.service'
import { AdminRole } from './admin.model'
import { BadRequestError, NotFoundError } from '../../shared/errors'

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
      dateFrom?: string
      dateTo?: string
      limit?: number
      offset?: number
    }
  ) {
    // RBAC: Non-super_admin can only see their own actions
    const effectiveAdminId = adminRole === 'super_admin' ? filters.adminId : adminId

    return await adminRepository.findAuditLogs({
      ...filters,
      adminId: effectiveAdminId,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined
    })
  },

  async exportAuditLogs(adminId: string, adminRole: AdminRole) {
    // RBAC: Only super_admin can export (or maybe others can export their own?)
    // PRD says: "GET /v1/admin/audit/export returns full JSON export (super_admin only)"
    if (adminRole !== 'super_admin') {
      throw new BadRequestError('Only super admin can export audit logs')
    }

    return await adminRepository.exportAuditLogs()
  }
}
