import { checklistRepository } from './checklists.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { activityService } from '../activities/activities.service'
import type { CreateChecklistInput, UpdateChecklistInput, CreateChecklistItemInput, UpdateChecklistItemInput } from './checklists.model'

export const checklistService = {
  getByTaskId: async (taskId: string) => {
    const lists = await checklistRepository.findByTaskId(taskId)
    const listsWithItems = await Promise.all(
      lists.map(async (list) => ({
        ...list,
        items: await checklistRepository.findItemsByChecklistId(list.id)
      }))
    )
    return listsWithItems
  },

  getById: async (id: string) => {
    const checklist = await checklistRepository.findById(id)
    if (!checklist) return null
    const items = await checklistRepository.findItemsByChecklistId(id)
    return { ...checklist, items }
  },

  create: async (data: CreateChecklistInput, userId: string) => {
    const checklist = await checklistRepository.create(data)
    const boardId = await taskRepository.getBoardIdFromTask(data.taskId)
    if (boardId) {
      await activityService.log({
        boardId,
        taskId: data.taskId,
        userId,
        action: 'created',
        targetType: 'checklist',
        targetId: checklist.id,
        changes: { title: data.title }
      })
    }
    return checklist
  },

  update: async (id: string, data: UpdateChecklistInput, userId: string) => {
    const checklist = await checklistRepository.update(id, data)
    const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
    if (boardId) {
      await activityService.log({
        boardId,
        taskId: checklist.taskId,
        userId,
        action: 'updated',
        targetType: 'checklist',
        targetId: id,
        changes: data
      })
    }
    return checklist
  },

  delete: async (id: string, userId: string) => {
    const checklist = await checklistRepository.findById(id)
    if (!checklist) throw new Error('Checklist not found')
    const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
    await checklistRepository.delete(id)
    if (boardId) {
      await activityService.log({
        boardId,
        taskId: checklist.taskId,
        userId,
        action: 'deleted',
        targetType: 'checklist',
        targetId: id,
        changes: { title: checklist.title }
      })
    }
    return checklist
  },

  // Items
  createItem: async (data: CreateChecklistItemInput, userId: string) => {
    const item = await checklistRepository.createItem(data)
    const checklist = await checklistRepository.findById(data.checklistId)
    if (checklist) {
      const boardId = await taskRepository.getBoardIdFromTask(checklist.taskId)
      if (boardId) {
        await activityService.log({
          boardId,
          taskId: checklist.taskId,
          userId,
          action: 'created',
          targetType: 'checklist_item',
          targetId: item.id,
          changes: { content: data.content }
        })
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
        await activityService.log({
          boardId,
          taskId: checklist.taskId,
          userId,
          action: 'updated',
          targetType: 'checklist_item',
          targetId: id,
          changes: data
        })
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
        await activityService.log({
          boardId,
          taskId: checklist.taskId,
          userId,
          action: 'deleted',
          targetType: 'checklist_item',
          targetId: id,
          changes: { content: item.content }
        })
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
        await activityService.log({
          boardId,
          taskId: checklist.taskId,
          userId,
          action: updated.isCompleted ? 'completed' : 'uncompleted',
          targetType: 'checklist_item',
          targetId: id,
          changes: { content: item.content }
        })
      }
    }
    return updated
  }
}
