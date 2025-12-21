import { columnRepository } from './columns.repository'
import { wsManager } from '../../websocket/manager'

export const columnService = {
  getColumnsByBoardId: (boardId: string) => columnRepository.findByBoardId(boardId),

  createColumn: async (data: { name: string; order: number; boardId: string }) => {
    const column = await columnRepository.create(data)
    wsManager.broadcast(`board:${data.boardId}`, { type: 'columns:updated', boardId: data.boardId })
    return column
  },

  updateColumn: async (id: string, data: { name?: string; order?: number }) => {
    const column = await columnRepository.update(id, data)
    wsManager.broadcast(`board:${column.boardId}`, { type: 'columns:updated', boardId: column.boardId })
    return column
  },

  deleteColumn: async (id: string) => {
    const column = await columnRepository.delete(id)
    wsManager.broadcast(`board:${column.boardId}`, { type: 'columns:updated', boardId: column.boardId })
    return column
  },
}
