import { templateRepository } from './templates.repository'
import { boardRepository } from '../boards/boards.repository'
import { userRepository } from '../users/users.repository'
import { boardService } from '../boards/boards.service'
import { workspaceRepository } from '../workspaces/workspaces.repository'
import { columnRepository } from '../columns/columns.repository'
import { labelRepository } from '../labels/labels.repository'
import { auditLogService, ADMIN_ACTIONS } from '../admin/auditLog.service'
import { eventBus } from '../../events/bus'
import { NotFoundError, ForbiddenError, ConflictError } from '../../shared/errors'
import type { CreateBoardTemplateInput, UpdateBoardTemplateInput, CreateTaskTemplateInput, UpdateTaskTemplateInput, MarketplaceQuerySchema, SubmitTemplateBody } from './templates.model'

const hasModeratorAccess = async (userId: string): Promise<boolean> => {
  const user = await userRepository.getById(userId)
  if (!user || !user.adminRole) return false
  return ['moderator', 'super_admin', 'support'].includes(user.adminRole)
}

const canModerate = async (userId: string): Promise<boolean> => {
  const user = await userRepository.getById(userId)
  if (!user || !user.adminRole) return false
  return ['moderator', 'super_admin'].includes(user.adminRole)
}

export const templateService = {
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

      const updated = await templateRepository.updateBoardTemplate(templateId, {
        status: 'pending',
        submittedAt: new Date(),
        categories: categories?.map(c => c.trim()).filter(c => c !== '') || template.categories || undefined,
      })

      await auditLogService.log({
        adminId: userId,
        action: ADMIN_ACTIONS.TEMPLATE_SUBMITTED,
        targetType: 'template',
        targetId: templateId,
        metadata: { templateName: updated.name }
      })

      return updated
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

      const template = await templateRepository.createBoardTemplate({
        name: exportData.board.name.trim(),
        description: exportData.board.description?.trim() || undefined,
        createdBy: userId,
        columnDefinitions: exportData.columns.map(c => ({
          name: c.name.trim(),
          position: c.position,
          tasks: exportData.tasks
            .filter(t => t.columnId === c.id)
            .map(t => ({
              title: t.title.trim(),
              description: t.description?.trim() || undefined,
              priority: t.priority || undefined,
              size: t.size || undefined,
              labelNames: exportData.taskLabels
                .filter(tl => tl.taskId === t.id)
                .map(tl => exportData.labels.find(l => l.id === tl.labelId)?.name.trim())
                .filter((name): name is string => !!name),
              checklists: exportData.checklists
                .filter(c => c.taskId === t.id)
                .map(c => ({
                  title: c.title.trim(),
                  items: exportData.checklistItems
                    .filter(ci => ci.checklistId === c.id)
                    .map(ci => ({
                      content: ci.content.trim(),
                      isCompleted: ci.isCompleted
                    }))
                }))
            }))
        })),
        defaultLabels: exportData.labels.map(l => ({ name: l.name.trim(), color: l.color })),
        status: 'pending',
        submittedAt: new Date(),
        categories: categories?.map(c => c.trim()).filter(c => c !== '') || [],
      })

      await auditLogService.log({
        adminId: userId,
        action: ADMIN_ACTIONS.TEMPLATE_SUBMITTED,
        targetType: 'template',
        targetId: template.id,
        metadata: { templateName: template.name }
      })

      return template
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

    eventBus.emitDomain('template.approved', { template, adminId })

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

    eventBus.emitDomain('template.rejected', { 
      template, 
      adminId, 
      reason: data?.reason, 
      comment: data?.comment 
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

    eventBus.emitDomain('template.removed', { template, adminId })

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

    const board = await boardService.createBoard({
      name: boardName || template.name,
      description: template.description || undefined,
      workspaceId,
      ownerId: userId,
    })

    const columnDefinitions = template.columnDefinitions
    if (Array.isArray(columnDefinitions)) {
      for (const col of columnDefinitions) {
        if (typeof col === 'object' && col !== null && 'name' in col && 'position' in col) {
          await columnRepository.create({
            name: String(col.name),
            position: String(col.position),
            boardId: board.id,
          })
        }
      }
    }

    const defaultLabels = template.defaultLabels
    if (Array.isArray(defaultLabels)) {
      for (const label of defaultLabels) {
        if (typeof label === 'object' && label !== null && 'name' in label && 'color' in label) {
          await labelRepository.create({
            name: String(label.name),
            color: String(label.color),
            boardId: board.id,
          })
        }
      }
    }

    return board
  },

  getBoardTemplates: (userId: string, workspaceId?: string) =>
    templateRepository.findBoardTemplates(userId, workspaceId),

  getBoardTemplateById: (id: string) => templateRepository.findBoardTemplateById(id),

  createBoardTemplate: (data: CreateBoardTemplateInput & { createdBy: string }) => {
    const normalized = {
      ...data,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      categories: data.categories?.map(c => c.trim()).filter(c => c !== '') || [],
    }
    return templateRepository.createBoardTemplate(normalized)
  },

  updateBoardTemplate: async (id: string, data: UpdateBoardTemplateInput) => {
    const existing = await templateRepository.findBoardTemplateById(id)
    if (!existing) throw new NotFoundError('Template not found')
    
    if (existing.status !== 'none') {
      throw new ConflictError('Template is immutable after submission')
    }

    const normalized = {
      ...data,
      name: data.name?.trim(),
      description: data.description === '' ? null : data.description?.trim(),
      categories: data.categories?.map(c => c.trim()).filter(c => c !== ''),
    }
    
    return templateRepository.updateBoardTemplate(id, normalized)
  },

  deleteBoardTemplate: (id: string) => templateRepository.deleteBoardTemplate(id),

  // Task Templates
  getTaskTemplatesByBoardId: (boardId: string) => templateRepository.findTaskTemplatesByBoardId(boardId),

  getTaskTemplateById: (id: string) => templateRepository.findTaskTemplateById(id),

  createTaskTemplate: (data: CreateTaskTemplateInput & { createdBy: string }) => {
    const normalized = {
      ...data,
      name: data.name.trim(),
    }
    return templateRepository.createTaskTemplate(normalized)
  },

  updateTaskTemplate: (id: string, data: UpdateTaskTemplateInput) => {
    const normalized = {
      ...data,
      name: data.name?.trim(),
    }
    return templateRepository.updateTaskTemplate(id, normalized)
  },

  deleteTaskTemplate: (id: string) => templateRepository.deleteTaskTemplate(id),
}
