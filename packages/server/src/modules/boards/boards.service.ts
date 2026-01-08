import { boardRepository } from './boards.repository'
import { wsManager } from '../../websocket/manager'

export const boardService = {
  getAllBoards: () => boardRepository.findAll(),

  getBoardById: (id: string) => boardRepository.findById(id),

  createBoard: async (data: { name: string; organizationId?: string; ownerId?: string }) => {
    const board = await boardRepository.create(data)
    wsManager.broadcast(`board:${board.id}`, { type: 'board:created', data: board })
    return board
  },

  updateBoard: async (id: string, data: { name?: string; organizationId?: string; ownerId?: string }) => {
    const board = await boardRepository.update(id, data)
    wsManager.broadcast(`board:${id}`, { type: 'board:updated', data: board })
    return board
  },

  deleteBoard: async (id: string) => {
    const board = await boardRepository.delete(id)
    wsManager.broadcast(`board:${id}`, { type: 'board:deleted', data: { id } })
    return board
  },
}
