import { labelRepository } from './labels.repository'
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

  addToCard: async (cardId: string, labelId: string) => {
    return labelRepository.addToCard(cardId, labelId)
  },

  removeFromCard: async (cardId: string, labelId: string) => {
    return labelRepository.removeFromCard(cardId, labelId)
  },

  getCardLabels: async (cardId: string) => {
    const result = await labelRepository.getCardLabels(cardId)
    return result.map(r => r.label)
  }
}
