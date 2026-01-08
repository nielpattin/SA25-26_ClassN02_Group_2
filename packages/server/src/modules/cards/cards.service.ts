import { cardRepository } from './cards.repository'
import { wsManager } from '../../websocket/manager'

export const cardService = {
  getCardById: (id: string) => cardRepository.findById(id),

  getCardsByColumnId: (columnId: string) => cardRepository.findByColumnId(columnId),

  getCardsByBoardIdEnriched: (boardId: string) => cardRepository.findByBoardIdEnriched(boardId),

  createCard: async (data: { title: string; description?: string; order: number; columnId: string; dueDate?: Date | null }) => {
    const card = await cardRepository.create(data)
    const boardId = await cardRepository.getBoardIdFromColumn(data.columnId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'cards:updated', columnId: data.columnId })
    return card
  },

  updateCard: async (id: string, data: { title?: string; description?: string; order?: number; columnId?: string; dueDate?: Date | null }) => {
    const card = await cardRepository.update(id, data)
    if (card.columnId) {
      const boardId = await cardRepository.getBoardIdFromColumn(card.columnId)
      if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'cards:updated', columnId: card.columnId })
    }
    return card
  },

  deleteCard: async (id: string) => {
    const card = await cardRepository.delete(id)
    if (card.columnId) {
      const boardId = await cardRepository.getBoardIdFromColumn(card.columnId)
      if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'cards:updated', columnId: card.columnId })
    }
    return card
  },
}
