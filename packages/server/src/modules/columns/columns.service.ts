import { columnRepository } from './columns.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { eventBus } from '../../events/bus'
import { generatePosition, needsRebalancing } from '../../shared/position'

export const columnService = {
  getColumnsByBoardId: (boardId: string) => columnRepository.findByBoardId(boardId),

  createColumn: async (data: { name: string; position?: string; boardId: string }, userId: string) => {
    let position = data.position

    if (!position) {
      const lastPosition = await columnRepository.getLastPositionInBoard(data.boardId)
      position = generatePosition(lastPosition, null)
    }

    const column = await columnRepository.create({
      name: data.name,
      position,
      boardId: data.boardId,
    })
    
    eventBus.emitDomain('column.created', { column, boardId: data.boardId, userId })
    
    return column
  },

  updateColumn: async (id: string, data: { name?: string; position?: string }, userId: string) => {
    const oldColumn = await columnRepository.findById(id)
    const column = await columnRepository.update(id, data)
    
    const changes: any = {}
    if (data.name && data.name !== oldColumn?.name) changes.name = { before: oldColumn?.name, after: data.name }

    eventBus.emitDomain('column.updated', { column, boardId: column.boardId, userId, changes })
    return column
  },

  moveColumn: async (
    columnId: string,
    beforeColumnId: string | undefined,
    afterColumnId: string | undefined,
    userId: string
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

    if (needsRebalancing(newPosition)) {
      await columnRepository.rebalanceBoard(column.boardId)
    }

    eventBus.emitDomain('column.moved', { column: updatedColumn, boardId: column.boardId, userId })
    return updatedColumn
  },

  archiveColumn: async (id: string, userId: string) => {
    const column = await columnRepository.archive(id)
    eventBus.emitDomain('column.archived', { column, boardId: column.boardId, userId })
    return column
  },

  copyColumn: async (id: string, userId: string) => {
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

    eventBus.emitDomain('column.created', { column: newColumn, boardId: newColumn.boardId, userId })
    return newColumn
  },

  moveColumnToBoard: async (id: string, targetBoardId: string, userId: string) => {
    const column = await columnRepository.findById(id)
    if (!column) throw new Error('Column not found')

    const oldBoardId = column.boardId
    const lastPosition = await columnRepository.getLastPositionInBoard(targetBoardId)
    const position = generatePosition(lastPosition, null)

    const updatedColumn = await columnRepository.update(id, { 
      boardId: targetBoardId,
      position 
    })

    eventBus.emitDomain('column.deleted', { columnId: id, boardId: oldBoardId, userId })
    eventBus.emitDomain('column.created', { column: updatedColumn, boardId: targetBoardId, userId })

    return updatedColumn
  },

  deleteColumn: async (id: string, userId: string) => {
    const column = await columnRepository.delete(id)
    eventBus.emitDomain('column.deleted', { columnId: id, boardId: column.boardId, userId })
    return column
  },
}
