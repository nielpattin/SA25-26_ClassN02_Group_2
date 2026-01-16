import { attachmentRepository } from './attachments.repository'
import type { CreateAttachmentInput } from './attachments.model'
import { taskRepository } from '../tasks/tasks.repository'
import { eventBus } from '../../events/bus'

export const attachmentService = {
  getByTaskId: async (taskId: string) => {
    return attachmentRepository.findByTaskId(taskId)
  },

  getById: async (id: string) => {
    return attachmentRepository.getById(id)
  },

  create: async (data: CreateAttachmentInput, userId: string) => {
    const attachment = await attachmentRepository.create(data)
    const boardId = await taskRepository.getBoardIdFromTask(data.taskId)
    
    if (boardId) {
      eventBus.emitDomain('attachment.added', { attachment, userId, boardId })
    }
    return attachment
  },

  delete: async (id: string, userId: string) => {
    const attachment = await attachmentRepository.getById(id)
    if (!attachment) return null
    
    const boardId = await taskRepository.getBoardIdFromTask(attachment.taskId)
    const result = await attachmentRepository.delete(id)
    
    if (boardId) {
       eventBus.emitDomain('attachment.deleted', { 
         attachmentId: id, 
         taskId: attachment.taskId, 
         userId, 
         boardId 
       })
    }
    return result
  },
}
