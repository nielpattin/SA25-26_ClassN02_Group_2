import { labelRepository } from './labels.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { wsManager } from '../../websocket/manager'
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

  addToTask: async (taskId: string, labelId: string) => {
    const result = await labelRepository.addToTask(taskId, labelId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      wsManager.broadcast(`board:${boardId}`, { type: 'task:updated' })
    }
    return result
  },

  removeFromTask: async (taskId: string, labelId: string) => {
    const result = await labelRepository.removeFromTask(taskId, labelId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      wsManager.broadcast(`board:${boardId}`, { type: 'task:updated' })
    }
    return result
  },

  getTaskLabels: async (taskId: string) => {
    const result = await labelRepository.getTaskLabels(taskId)
    return result.map((r: { label: typeof result[0]['label'] }) => r.label)
  }
}
