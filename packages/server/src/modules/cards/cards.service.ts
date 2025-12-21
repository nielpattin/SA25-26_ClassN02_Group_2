import { cardRepository } from './cards.repository'
import { wsManager } from '../../websocket/manager'

export const cardService = {
  getCardsByColumnId: (columnId: string) => cardRepository.findByColumnId(columnId),

  createCard: async (data: { title: string; description?: string; order: number; columnId: string }) => {
    const card = await cardRepository.create(data)
    const boardId = await cardRepository.getBoardIdFromColumn(data.columnId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'cards:updated', columnId: data.columnId })
    return card
  },

  updateCard: async (id: string, data: { title?: string; description?: string; order?: number; columnId?: string }) => {
    const card = await cardRepository.update(id, data)
    const boardId = await cardRepository.getBoardIdFromColumn(card.columnId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'cards:updated', columnId: card.columnId })
    return card
  },

  deleteCard: async (id: string) => {
    const card = await cardRepository.delete(id)
    const boardId = await cardRepository.getBoardIdFromColumn(card.columnId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'cards:updated', columnId: card.columnId })
    return card
  },
}
