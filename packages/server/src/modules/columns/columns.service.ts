import { columnRepository } from './columns.repository'
import { taskRepository } from '../tasks/tasks.repository'
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

  archiveColumn: async (id: string) => {
    const column = await columnRepository.archive(id)
    wsManager.broadcast(`board:${column.boardId}`, { type: 'column:deleted', data: { id } })
    return column
  },

  copyColumn: async (id: string) => {
    const originalColumn = await columnRepository.findById(id)
    if (!originalColumn) throw new Error('Column not found')

    const lastPosition = await columnRepository.getLastPositionInBoard(originalColumn.boardId)
    const position = generatePosition(lastPosition, null)

    const newColumn = await columnRepository.create({
      name: `${originalColumn.name} (Copy)`,
      position,
      boardId: originalColumn.boardId,
    })

    const originalTasks = await taskRepository.findByColumnId(id)
    for (const task of originalTasks) {
      await taskRepository.create({
        title: task.title,
        description: task.description || undefined,
        position: task.position,
        columnId: newColumn.id,
        priority: task.priority || undefined,
        dueDate: task.dueDate,
        coverImageUrl: task.coverImageUrl || undefined,
      })
    }

    wsManager.broadcast(`board:${originalColumn.boardId}`, { type: 'column:created', data: newColumn })
    return newColumn
  },

  moveColumnToBoard: async (id: string, targetBoardId: string) => {
    const column = await columnRepository.findById(id)
    if (!column) throw new Error('Column not found')

    const oldBoardId = column.boardId
    const lastPosition = await columnRepository.getLastPositionInBoard(targetBoardId)
    const position = generatePosition(lastPosition, null)

    const updatedColumn = await columnRepository.update(id, { 
      boardId: targetBoardId,
      position 
    })

    wsManager.broadcast(`board:${oldBoardId}`, { type: 'column:deleted', data: { id } })
    wsManager.broadcast(`board:${targetBoardId}`, { type: 'column:created', data: updatedColumn })

    return updatedColumn
  },

  deleteColumn: async (id: string) => {
    const column = await columnRepository.delete(id)
    wsManager.broadcast(`board:${column.boardId}`, { type: 'column:deleted', data: { id } })
    return column
  },
}
