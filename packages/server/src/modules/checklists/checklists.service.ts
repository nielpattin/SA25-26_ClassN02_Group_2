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
    const title = data.title.trim()
    if (!title) throw new Error('Title is required')
    
    const checklist = await checklistRepository.create({ ...data, title })
    const boardId = await taskRepository.getBoardIdFromTask(data.taskId)
    if (boardId) {
      eventBus.emitDomain('checklist.created', { checklist, taskId: data.taskId, userId, boardId })
    }
    return checklist
  },

  update: async (id: string, data: UpdateChecklistInput, userId: string) => {
    const updateData = { ...data }
    if (updateData.title !== undefined) {
      updateData.title = updateData.title.trim()
      if (!updateData.title) throw new Error('Title cannot be empty')
    }

    const checklist = await checklistRepository.update(id, updateData)
    const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
    if (boardId) {
      eventBus.emitDomain('checklist.updated', { checklist, taskId: checklist.taskId, userId, boardId, changes: updateData })
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
    const content = data.content.trim()
    if (!content) throw new Error('Content is required')

    const item = await checklistRepository.createItem({ ...data, content })
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
    const updateData = { ...data }
    if (updateData.content !== undefined) {
      updateData.content = updateData.content.trim()
      if (!updateData.content) throw new Error('Content cannot be empty')
    }

    const item = await checklistRepository.updateItem(id, updateData)
    const checklist = await checklistRepository.findById(item.checklistId)
    if (checklist) {
      const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
      if (boardId) {
        eventBus.emitDomain('checklist.item.updated', { item, taskId: checklist.taskId, userId, boardId, changes: updateData })
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
