import { attachmentRepository } from './attachments.repository'
import type { CreateAttachmentInput } from './attachments.model'
import { taskRepository } from '../tasks/tasks.repository'
import { wsManager } from '../../websocket/manager'

export const attachmentService = {
  getByTaskId: async (taskId: string) => {
    return attachmentRepository.findByTaskId(taskId)
  },

  getById: async (id: string) => {
    return attachmentRepository.getById(id)
  },

  create: async (data: CreateAttachmentInput) => {
    const attachment = await attachmentRepository.create(data)
    const boardId = await taskRepository.getBoardIdFromTask(data.taskId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:updated' })
    return attachment
  },

  delete: async (id: string) => {
    const attachment = await attachmentRepository.getById(id)
    if (!attachment) return null
    const boardId = await taskRepository.getBoardIdFromTask(attachment.taskId)
    const result = await attachmentRepository.delete(id)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:updated' })
    return result
  },
}
