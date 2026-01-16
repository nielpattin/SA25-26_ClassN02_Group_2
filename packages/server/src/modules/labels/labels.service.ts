import { labelRepository } from './labels.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { eventBus } from '../../events/bus'
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
      eventBus.emitDomain('label.added', { 
        taskId, 
        labelId, 
        userId: actorId, 
        boardId, 
        labelName: label?.name 
      })
    }
    return result
  },

  removeFromTask: async (taskId: string, labelId: string, actorId: string) => {
    const result = await labelRepository.removeFromTask(taskId, labelId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    const label = await labelRepository.findById(labelId)

    if (boardId) {
      eventBus.emitDomain('label.removed', { 
        taskId, 
        labelId, 
        userId: actorId, 
        boardId, 
        labelName: label?.name 
      })
    }
    return result
  },

  getTaskLabels: async (taskId: string) => {
    const result = await labelRepository.getTaskLabels(taskId)
    return result.map((r: { label: typeof result[0]['label'] }) => r.label)
  }
}
