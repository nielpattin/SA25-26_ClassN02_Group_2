import { labelRepository } from './labels.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { wsManager } from '../../websocket/manager'
import { activityService } from '../activities/activities.service'
import type { CreateLabelInput, UpdateLabelInput } from './labels.model'

export const labelService = {
  getByBoardId: async (boardId: string) => {
    return labelRepository.findByBoardId(boardId)
  },

  getById: async (id: string) => {
    return labelRepository.findById(id)
  },

  create: async (data: CreateLabelInput) => {
    return labelRepository.create(data)
  },

  update: async (id: string, data: UpdateLabelInput) => {
    return labelRepository.update(id, data)
  },

  delete: async (id: string) => {
    return labelRepository.delete(id)
  },

  addToTask: async (taskId: string, labelId: string, actorId: string) => {
    const result = await labelRepository.addToTask(taskId, labelId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    const label = await labelRepository.findById(labelId)

    if (boardId) {
      wsManager.broadcast(`board:${boardId}`, { 
        type: 'task:updated',
        data: { id: taskId }
      })
      await activityService.log({
        boardId,
        taskId,
        userId: actorId,
        action: 'label_added',
        targetType: 'label',
        targetId: labelId,
        changes: { name: label?.name }
      })
    }
    return result
  },

  removeFromTask: async (taskId: string, labelId: string, actorId: string) => {
    const result = await labelRepository.removeFromTask(taskId, labelId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    const label = await labelRepository.findById(labelId)

    if (boardId) {
      wsManager.broadcast(`board:${boardId}`, { 
        type: 'task:updated',
        data: { id: taskId }
      })
      await activityService.log({
        boardId,
        taskId,
        userId: actorId,
        action: 'label_removed',
        targetType: 'label',
        targetId: labelId,
        changes: { name: label?.name }
      })
    }
    return result
  },

  getTaskLabels: async (taskId: string) => {
    const result = await labelRepository.getTaskLabels(taskId)
    return result.map((r: { label: typeof result[0]['label'] }) => r.label)
  }
}
