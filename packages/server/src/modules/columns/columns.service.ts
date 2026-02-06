import { columnRepository } from './columns.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { boardRepository } from '../boards/boards.repository'
import { workspaceRepository } from '../workspaces/workspaces.repository'
import { eventBus } from '../../events/bus'
import { generatePosition, needsRebalancing } from '../../shared/position'
import { ForbiddenError } from '../../shared/errors'
import { db } from '../../db'
import { columns, tasks } from '../../db/schema'

export const columnService = {
  getColumnsByBoardId: async (boardId: string, userId: string) => {
    // Check if user has access to this board
    const { boardService } = await import('../boards/boards.service')
    const hasAccess = await boardService.canAccessBoard(boardId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Access denied')
    }
    
    return columnRepository.findByBoardId(boardId)
  },

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

  updateColumn: async (id: string, data: { name?: string; position?: string; version?: number }, userId: string) => {
    const oldColumn = await columnRepository.findById(id)
    const { version, ...updateData } = data
    const column = await columnRepository.update(id, updateData, version)
    
    const changes: any = {}
    if (data.name && data.name !== oldColumn?.name) changes.name = { before: oldColumn?.name, after: data.name }

    eventBus.emitDomain('column.updated', { column, boardId: column.boardId, userId, changes })
    return column
  },

  moveColumn: async (
    columnId: string,
    position: string,
    userId: string,
    version?: number
  ) => {
    const column = await columnRepository.findById(columnId)
    if (!column) throw new Error('Column not found')

    // Basic validation
    if (!position || position.length > 100 || !/^[a-zA-Z0-9]+$/.test(position)) {
      throw new Error('Invalid position format')
    }

    const updatedColumn = await columnRepository.update(columnId, { position }, version)

    if (needsRebalancing(position)) {
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

  restoreColumn: async (id: string, userId: string) => {
    const column = await columnRepository.findById(id)
    if (!column) throw new Error('Column not found')

    const board = await boardRepository.findById(column.boardId)
    if (board?.workspaceId) {
      const membership = await workspaceRepository.getMember(board.workspaceId, userId)
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        throw new ForbiddenError('Only workspace admins can restore columns')
      }
    }

    const lastPosition = await columnRepository.getLastPositionInBoard(column.boardId)
    const position = generatePosition(lastPosition, null)

    const restoredColumn = await columnRepository.restore(id, position)
    
    const archivedTasks = await taskRepository.findArchivedByColumnId(id)
    for (const task of archivedTasks) {
      const restoredTask = await taskRepository.restore(task.id)
      eventBus.emitDomain('task.restored', { task: restoredTask, userId, boardId: column.boardId })
    }

    eventBus.emitDomain('column.restored', { column: restoredColumn, boardId: restoredColumn.boardId, userId })
    return restoredColumn
  },

  permanentDeleteColumn: async (id: string, userId: string) => {
    const column = await columnRepository.findById(id)
    if (!column) throw new Error('Column not found')

    const board = await boardRepository.findById(column.boardId)
    if (board?.workspaceId) {
      const membership = await workspaceRepository.getMember(board.workspaceId, userId)
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        throw new ForbiddenError('Only workspace admins can permanently delete columns')
      }
    }

    const deletedColumn = await columnRepository.permanentDelete(id)
    eventBus.emitDomain('column.deleted', { columnId: id, boardId: column.boardId, userId })
    return deletedColumn
  },

  copyColumn: async (id: string, userId: string) => {
    const originalColumn = await columnRepository.findById(id)
    if (!originalColumn) throw new Error('Column not found')

    const lastPosition = await columnRepository.getLastPositionInBoard(originalColumn.boardId)
    const position = generatePosition(lastPosition, null)

    const originalTasks = await taskRepository.findByColumnId(id)

    // Use transaction to ensure column + tasks are created atomically
    const newColumn = await db.transaction(async (tx) => {
      const [createdColumn] = await tx.insert(columns).values({
        name: `${originalColumn.name} (Copy)`,
        position,
        boardId: originalColumn.boardId,
      }).returning()

      for (const task of originalTasks) {
        await tx.insert(tasks).values({
          title: task.title,
          description: task.description,
          position: task.position,
          columnId: createdColumn.id,
          priority: task.priority,
          dueDate: task.dueDate,
          coverImageUrl: task.coverImageUrl,
        })
      }

      return createdColumn
    })

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
