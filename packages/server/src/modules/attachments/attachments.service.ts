import { attachmentRepository } from './attachments.repository'
import type { CreateAttachmentInput } from './attachments.model'
import { cardRepository } from '../cards/cards.repository'
import { wsManager } from '../../websocket/manager'

export const attachmentService = {
  getByCardId: async (cardId: string) => {
    return attachmentRepository.findByCardId(cardId)
  },

  getById: async (id: string) => {
    return attachmentRepository.getById(id)
  },

  create: async (data: CreateAttachmentInput) => {
    const attachment = await attachmentRepository.create(data)
    const boardId = await cardRepository.getBoardIdFromCard(data.cardId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'cards:updated' })
    return attachment
  },

  delete: async (id: string) => {
    const attachment = await attachmentRepository.getById(id)
    if (!attachment) return null
    const boardId = await cardRepository.getBoardIdFromCard(attachment.cardId)
    const result = await attachmentRepository.delete(id)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'cards:updated' })
    return result
  },
}
