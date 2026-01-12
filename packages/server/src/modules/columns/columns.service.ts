import { columnRepository } from './columns.repository'
import { wsManager } from '../../websocket/manager'
import { generatePosition, needsRebalancing } from '../../shared/position'

export const columnService = {
  getColumnsByBoardId: (boardId: string) => columnRepository.findByBoardId(boardId),

  createColumn: async (data: { name: string; position?: string; boardId: string }) => {
    let position = data.position

    // Auto-generate position at end if not provided
    if (!position) {
      const lastPosition = await columnRepository.getLastPositionInBoard(data.boardId)
      position = generatePosition(lastPosition, null)
    }

    const column = await columnRepository.create({
      name: data.name,
      position,
      boardId: data.boardId,
    })
    wsManager.broadcast(`board:${data.boardId}`, { type: 'column:created', data: column })
    return column
  },

  updateColumn: async (id: string, data: { name?: string; position?: string }) => {
    const column = await columnRepository.update(id, data)
    wsManager.broadcast(`board:${column.boardId}`, { type: 'column:updated', data: column })
    return column
  },

  moveColumn: async (
    columnId: string,
    beforeColumnId?: string,
    afterColumnId?: string
  ) => {
    const column = await columnRepository.findById(columnId)
    if (!column) throw new Error('Column not found')

    const { before, after } = await columnRepository.getPositionBetween(
      column.boardId,
      beforeColumnId,
      afterColumnId
    )

    const newPosition = generatePosition(before, after)

    const updatedColumn = await columnRepository.update(columnId, { position: newPosition })

    // Check if rebalancing is needed
    if (needsRebalancing(newPosition)) {
      await columnRepository.rebalanceBoard(column.boardId)
    }

    wsManager.broadcast(`board:${column.boardId}`, { type: 'column:moved', data: updatedColumn })
    return updatedColumn
  },

  deleteColumn: async (id: string) => {
    const column = await columnRepository.delete(id)
    wsManager.broadcast(`board:${column.boardId}`, { type: 'column:deleted', data: { id } })
    return column
  },
}
