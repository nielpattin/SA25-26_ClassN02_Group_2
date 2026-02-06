import { checklistRepository } from './checklists.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { eventBus } from '../../events/bus'
import { ForbiddenError } from '../../shared/errors'
import type { CreateChecklistInput, UpdateChecklistInput, CreateChecklistItemInput, UpdateChecklistItemInput } from './checklists.model'

export const checklistService = {
  getByTaskId: async (taskId: string, userId: string) => {
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      const { boardService } = await import('../boards/boards.service')
      const hasAccess = await boardService.canAccessBoard(boardId, userId)
      if (!hasAccess) {
        throw new ForbiddenError('Access denied')
      }
    }

    const lists = await checklistRepository.findByTaskId(taskId)
    return Promise.all(
      lists.map(async (list) => ({
        ...list,
        items: await checklistRepository.findItemsByChecklistId(list.id)
      }))
    )
  },

  getById: async (id: string, userId: string) => {
    const checklist = await checklistRepository.findById(id)
    if (!checklist) return null

    const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
    if (boardId) {
      const { boardService } = await import('../boards/boards.service')
      const hasAccess = await boardService.canAccessBoard(boardId, userId)
      if (!hasAccess) {
        throw new ForbiddenError('Access denied')
      }
    }

    const items = await checklistRepository.findItemsByChecklistId(id)
    return { ...checklist, items }
  },

  create: async (data: CreateChecklistInput, userId: string) => {
    const checklist = await checklistRepository.create(data)
    const boardId = await taskRepository.getBoardIdFromTask(data.taskId)
    if (boardId) {
      eventBus.emitDomain('checklist.created', { checklist, taskId: data.taskId, userId, boardId })
    }
    return checklist
  },

  update: async (id: string, data: UpdateChecklistInput, userId: string) => {
    const checklist = await checklistRepository.update(id, data)
    const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
    if (boardId) {
      eventBus.emitDomain('checklist.updated', { checklist, taskId: checklist.taskId, userId, boardId, changes: data })
    }
    return checklist
  },

  delete: async (id: string, userId: string) => {
    const checklist = await checklistRepository.findById(id)
    if (!checklist) throw new Error('Checklist not found')
    const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
    await checklistRepository.delete(id)
    if (boardId) {
      eventBus.emitDomain('checklist.deleted', { checklist, taskId: checklist.taskId, userId, boardId })
    }
    return checklist
  },

  createItem: async (data: CreateChecklistItemInput, userId: string) => {
    const item = await checklistRepository.createItem(data)
    const checklist = await checklistRepository.findById(data.checklistId)
    if (checklist) {
      const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
      if (boardId) {
        eventBus.emitDomain('checklist.item.created', { item, taskId: checklist.taskId, userId, boardId })
      }
    }
    return item
  },

  updateItem: async (id: string, data: UpdateChecklistItemInput, userId: string) => {
    const item = await checklistRepository.updateItem(id, data)
    const checklist = await checklistRepository.findById(item.checklistId)
    if (checklist) {
      const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
      if (boardId) {
        eventBus.emitDomain('checklist.item.updated', { item, taskId: checklist.taskId, userId, boardId, changes: data })
      }
    }
    return item
  },

  deleteItem: async (id: string, userId: string) => {
    const item = await checklistRepository.findItemById(id)
    if (!item) throw new Error('Item not found')
    const checklist = await checklistRepository.findById(item.checklistId)
    await checklistRepository.deleteItem(id)
    if (checklist) {
      const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
      if (boardId) {
        eventBus.emitDomain('checklist.item.deleted', { item, taskId: checklist.taskId, userId, boardId })
      }
    }
    return item
  },

  toggleItem: async (id: string, userId: string) => {
    const item = await checklistRepository.findItemById(id)
    if (!item) return null
    const updated = await checklistRepository.updateItem(id, { isCompleted: !item.isCompleted })
    const checklist = await checklistRepository.findById(item.checklistId)
    if (checklist) {
      const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
      if (boardId) {
        eventBus.emitDomain('checklist.item.updated', { 
          item: updated, 
          taskId: checklist.taskId, 
          userId, 
          boardId, 
          changes: { isCompleted: updated.isCompleted } 
        })
      }
    }
    return updated
  }
}
