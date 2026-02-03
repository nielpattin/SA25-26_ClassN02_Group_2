import { templateRepository } from './templates.repository'
import { boardRepository } from '../boards/boards.repository'
import { userRepository } from '../users/users.repository'
import { boardService } from '../boards/boards.service'
import { workspaceRepository } from '../workspaces/workspaces.repository'
import { columnRepository } from '../columns/columns.repository'
import { labelRepository } from '../labels/labels.repository'
import { auditLogService, ADMIN_ACTIONS } from '../admin/auditLog.service'
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors'
import type { CreateBoardTemplateInput, UpdateBoardTemplateInput, CreateTaskTemplateInput, UpdateTaskTemplateInput, MarketplaceQuerySchema, SubmitTemplateBody } from './templates.model'

const hasModeratorAccess = async (userId: string): Promise<boolean> => {
  const user = await userRepository.getById(userId)
  if (!user || !user.adminRole) return false
  // moderator, super_admin, and support can access moderation queues
  return ['moderator', 'super_admin', 'support'].includes(user.adminRole)
}

const canModerate = async (userId: string): Promise<boolean> => {
  const user = await userRepository.getById(userId)
  if (!user || !user.adminRole) return false
  // Only moderator and super_admin can perform moderation actions
  return ['moderator', 'super_admin'].includes(user.adminRole)
}

export const templateService = {
  // Board Templates
  getMarketplaceTemplates: (query: typeof MarketplaceQuerySchema.static) =>
    templateRepository.findMarketplaceTemplates(query),

  getMarketplaceTemplateById: async (id: string) => {
    const template = await templateRepository.findMarketplaceTemplateById(id)
    if (!template) throw new NotFoundError('Template not found')
    return template
  },

  submitTemplate: async (userId: string, data: typeof SubmitTemplateBody.static) => {
    const { boardId, templateId, categories } = data

    if (templateId) {
      const template = await templateRepository.findBoardTemplateById(templateId)
      if (!template) throw new NotFoundError('Template not found')
      if (template.createdBy !== userId) throw new ForbiddenError('You can only submit your own templates')

      return templateRepository.updateBoardTemplate(templateId, {
        status: 'pending',
        submittedAt: new Date(),
        categories: categories || template.categories || undefined,
      })
    }

    if (boardId) {
      const exportData = await boardRepository.getExportData(boardId)
      if (!exportData) throw new NotFoundError('Board not found')

      const members = await boardRepository.getMembers(boardId)
      const isOwner = exportData.board.ownerId === userId
      const isBoardAdmin = members.some(m => m.userId === userId && m.role === 'admin')

      if (!isOwner && !isBoardAdmin) {
        throw new ForbiddenError('You must be a board owner or admin to submit it as a template')
      }

      return templateRepository.createBoardTemplate({
        name: exportData.board.name,
        description: exportData.board.description || undefined,
        createdBy: userId,
        columnDefinitions: exportData.columns.map(c => ({ name: c.name, position: c.position })),
        defaultLabels: exportData.labels.map(l => ({ name: l.name, color: l.color })),
        status: 'pending',
        submittedAt: new Date(),
        categories: categories || [],
      })
    }

    throw new Error('Either boardId or templateId is required')
  },

  approveTemplate: async (adminId: string, templateId: string) => {
    if (!await canModerate(adminId)) throw new ForbiddenError('Only moderators can approve templates')

    const template = await templateRepository.updateBoardTemplate(templateId, {
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: adminId,
    })

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.TEMPLATE_APPROVED,
      targetType: 'template',
      targetId: templateId,
      metadata: { templateName: template.name }
    })

    return template
  },

  rejectTemplate: async (adminId: string, templateId: string, data?: { reason?: string; comment?: string }) => {
    if (!await canModerate(adminId)) throw new ForbiddenError('Only moderators can reject templates')

    const template = await templateRepository.updateBoardTemplate(templateId, {
      status: 'rejected',
      rejectionReason: data?.reason,
      rejectionComment: data?.comment,
    })

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.TEMPLATE_REJECTED,
      targetType: 'template',
      targetId: templateId,
      metadata: { templateName: template.name, reason: data?.reason, comment: data?.comment }
    })

    return template
  },

  getPendingSubmissions: async (userId: string, filters?: { status?: string; category?: string }) => {
    if (!await hasModeratorAccess(userId)) throw new ForbiddenError('Admin access required')
    return templateRepository.findPendingSubmissions(filters)
  },

  getTakedownRequests: async (userId: string) => {
    if (!await hasModeratorAccess(userId)) throw new ForbiddenError('Admin access required')
    return templateRepository.findTakedownRequests()
  },

  requestTakedown: async (userId: string, templateId: string) => {
    const template = await templateRepository.findBoardTemplateById(templateId)
    if (!template) throw new NotFoundError('Template not found')
    if (template.createdBy !== userId) throw new ForbiddenError('Only the author can request a takedown')

    const takedownAt = new Date()
    takedownAt.setDate(takedownAt.getDate() + 7)

    return templateRepository.updateBoardTemplate(templateId, {
      takedownRequestedAt: new Date(),
      takedownAt,
    })
  },

  removeTemplate: async (adminId: string, templateId: string) => {
    if (!await canModerate(adminId)) throw new ForbiddenError('Only moderators can remove templates')

    const template = await templateRepository.updateBoardTemplate(templateId, {
      takedownAt: new Date(),
    })

    await auditLogService.log({
      adminId,
      action: ADMIN_ACTIONS.TEMPLATE_REMOVED,
      targetType: 'template',
      targetId: templateId,
      metadata: { templateName: template.name }
    })

    return template
  },

  cloneMarketplaceTemplate: async (templateId: string, workspaceId: string, userId: string, boardName?: string) => {
    const template = await templateRepository.findBoardTemplateById(templateId)
    if (!template || template.status !== 'approved') {
      throw new NotFoundError('Template not found or not approved')
    }

    if (template.takedownAt && template.takedownAt < new Date()) {
      throw new NotFoundError('Template has been removed')
    }

    // Check workspace access
    const membership = await workspaceRepository.getMember(workspaceId, userId)
    if (!membership) {
      throw new ForbiddenError('You do not have access to this workspace')
    }

    // Create board
    const board = await boardService.createBoard({
      name: boardName || template.name,
      description: template.description || undefined,
      workspaceId,
      ownerId: userId,
    })

    // Create columns
    const columnDefinitions = template.columnDefinitions as { name: string; position: string }[]
    for (const col of columnDefinitions) {
      await columnRepository.create({
        name: col.name,
        position: col.position,
        boardId: board.id,
      })
    }

    // Create labels
    const defaultLabels = template.defaultLabels as { name: string; color: string }[] | null
    if (defaultLabels) {
      for (const label of defaultLabels) {
        await labelRepository.create({
          name: label.name,
          color: label.color,
          boardId: board.id,
        })
      }
    }

    return board
  },

  getBoardTemplates: (userId: string, workspaceId?: string) =>
    templateRepository.findBoardTemplates(userId, workspaceId),

  getBoardTemplateById: (id: string) => templateRepository.findBoardTemplateById(id),

  createBoardTemplate: (data: CreateBoardTemplateInput & { createdBy: string }) =>
    templateRepository.createBoardTemplate(data),

  updateBoardTemplate: async (id: string, data: UpdateBoardTemplateInput) => {
    // Check if template exists and is immutable
    const existing = await templateRepository.findBoardTemplateById(id)
    if (!existing) throw new NotFoundError('Template not found')
    
    // Templates are immutable after submission (pending, approved, or rejected)
    if (existing.status !== 'none') {
      throw new ConflictError('Template is immutable after submission')
    }
    
    return templateRepository.updateBoardTemplate(id, data)
  },

  deleteBoardTemplate: (id: string) => templateRepository.deleteBoardTemplate(id),

  // Task Templates
  getTaskTemplatesByBoardId: (boardId: string) => templateRepository.findTaskTemplatesByBoardId(boardId),

  getTaskTemplateById: (id: string) => templateRepository.findTaskTemplateById(id),

  createTaskTemplate: (data: CreateTaskTemplateInput & { createdBy: string }) =>
    templateRepository.createTaskTemplate(data),

  updateTaskTemplate: (id: string, data: UpdateTaskTemplateInput) =>
    templateRepository.updateTaskTemplate(id, data),

  deleteTaskTemplate: (id: string) => templateRepository.deleteTaskTemplate(id),
}
