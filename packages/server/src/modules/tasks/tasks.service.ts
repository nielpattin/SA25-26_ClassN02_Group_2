import { taskRepository } from './tasks.repository'
import { columnRepository } from '../columns/columns.repository'
import { boardRepository } from '../boards/boards.repository'
import { workspaceRepository } from '../workspaces/workspaces.repository'
import { notificationRepository } from '../notifications/notifications.repository'
import { eventBus } from '../../events/bus'
import { generatePosition, needsRebalancing } from '../../shared/position'
import { ForbiddenError } from '../../shared/errors'

export const taskService = {
  getTaskById: (id: string) => taskRepository.findById(id),

  getTasksByColumnId: (columnId: string) => taskRepository.findByColumnId(columnId),

  getTasksByBoardIdEnriched: (boardId: string) => taskRepository.findByBoardIdEnriched(boardId),

  createTask: async (data: {
    title: string
    description?: string
    position?: string
    columnId: string
    priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none'
    reminder?: 'none' | 'on_day' | '1_day' | '2_days' | '1_week'
    startDate?: Date | null
    dueDate?: Date | null
    coverImageUrl?: string
  }, userId: string) => {
    let position = data.position
    if (!position) {
      const lastPosition = await taskRepository.getLastPositionInColumn(data.columnId)
      position = generatePosition(lastPosition, null)
    }

    const task = await taskRepository.create({ ...data, position })
    const boardId = await taskRepository.getBoardIdFromColumn(data.columnId)
    
    if (boardId) {
      eventBus.emitDomain('task.created', { task, userId, boardId })
    }
    
    return task
  },

  updateTask: async (id: string, data: {
    title?: string
    description?: string
    position?: string
    columnId?: string
    priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null
    reminder?: 'none' | 'on_day' | '1_day' | '2_days' | '1_week'
    startDate?: Date | null
    dueDate?: Date | null
    coverImageUrl?: string | null
    version?: number
  }, userId: string) => {
    const oldTask = await taskRepository.findById(id)
    const { version, ...updateData } = data as any

    if (data.dueDate !== undefined) {
      const oldTime = oldTask?.dueDate?.getTime()
      const newTime = data.dueDate?.getTime()
      if (oldTime !== newTime) {
        updateData.reminderSentAt = null
        updateData.overdueSentAt = null
        // Clear old notifications so they can be re-triggered for the new date
        await notificationRepository.deleteByType(id, 'due_soon')
        await notificationRepository.deleteByType(id, 'overdue')
      }
    }

    const task = await taskRepository.update(id, updateData, version)
    
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) {
        const changes: any = {}
        if (data.title && data.title !== oldTask?.title) changes.title = { before: oldTask?.title, after: data.title }
        if (data.description !== undefined && data.description !== oldTask?.description) changes.description = { before: oldTask?.description, after: data.description }
        if (data.priority && data.priority !== oldTask?.priority) changes.priority = { before: oldTask?.priority, after: data.priority }
        if (data.startDate !== undefined && data.startDate?.getTime() !== oldTask?.startDate?.getTime()) changes.startDate = { before: oldTask?.startDate, after: data.startDate }
        if (data.dueDate !== undefined && data.dueDate?.getTime() !== oldTask?.dueDate?.getTime()) changes.dueDate = { before: oldTask?.dueDate, after: data.dueDate }
        if (data.coverImageUrl !== undefined && data.coverImageUrl !== oldTask?.coverImageUrl) changes.coverImageUrl = { before: oldTask?.coverImageUrl, after: data.coverImageUrl }

        eventBus.emitDomain('task.updated', { task, userId, boardId, changes })
      }
    }
    return task
  },

  archiveTask: async (id: string, userId: string) => {
    const task = await taskRepository.archive(id)
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) {
        eventBus.emitDomain('task.archived', { task, userId, boardId })
      }
    }
    return task
  },

  restoreTask: async (id: string, userId: string) => {
    const task = await taskRepository.findById(id)
    if (!task) throw new Error('Task not found')
    if (!task.columnId) throw new Error('Task has no column')

    let targetColumnId = task.columnId
    const column = await columnRepository.findById(targetColumnId)
    const boardId = await taskRepository.getBoardIdFromColumn(targetColumnId)
    if (!boardId) throw new Error('Board not found')

    const board = await boardRepository.findById(boardId)
    if (board?.workspaceId) {
      const membership = await workspaceRepository.getMember(board.workspaceId, userId)
      if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
        throw new ForbiddenError('Only workspace admins can restore tasks')
      }
    }

    if (!column || column.archivedAt) {
      const activeColumns = await columnRepository.findByBoardId(boardId)
      if (activeColumns.length === 0) {
        throw new Error('No active columns in board to restore task to')
      }
      targetColumnId = activeColumns[0].id
    }

    const lastPosition = await taskRepository.getLastPositionInColumn(targetColumnId)
    const position = generatePosition(lastPosition, null)

    const restoredTask = await taskRepository.update(id, {
      columnId: targetColumnId,
      position,
      archivedAt: null,
    })

    eventBus.emitDomain('task.restored', { task: restoredTask, userId, boardId })
    return restoredTask
  },

  permanentDeleteTask: async (id: string, userId: string) => {
    const task = await taskRepository.findById(id)
    if (!task) throw new Error('Task not found')
    
    const boardId = await taskRepository.getBoardIdFromTask(id)
    if (boardId) {
      const board = await boardRepository.findById(boardId)
      if (board?.workspaceId) {
        const membership = await workspaceRepository.getMember(board.workspaceId, userId)
        if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
          throw new ForbiddenError('Only workspace admins can permanently delete tasks')
        }
      }
    }

    const deletedTask = await taskRepository.permanentDelete(id)
    if (boardId) {
      eventBus.emitDomain('task.deleted', { task: deletedTask, userId, boardId })
    }
    return deletedTask
  },

  deleteTask: async (id: string, userId: string) => {
    const boardId = await taskRepository.getBoardIdFromTask(id)
    const task = await taskRepository.delete(id)
    const bId = boardId || (task.columnId ? await taskRepository.getBoardIdFromColumn(task.columnId) : null)
    
    if (bId) {
      eventBus.emitDomain('task.deleted', { task, userId, boardId: bId })
    }
    
    return task
  },

  moveTask: async (
    taskId: string,
    userId: string,
    targetColumnId?: string,
    beforeTaskId?: string,
    afterTaskId?: string,
    version?: number
  ) => {
    const task = await taskRepository.findById(taskId)
    if (!task) throw new Error('Task not found')

    const oldColumnId = task.columnId
    const columnId = targetColumnId ?? task.columnId
    if (!columnId) throw new Error('No target column')

    const { before, after } = await taskRepository.getPositionBetween(columnId, beforeTaskId, afterTaskId)
    const newPosition = generatePosition(before, after)

    const [oldBoardId, newBoardId] = await Promise.all([
      oldColumnId ? taskRepository.getBoardIdFromColumn(oldColumnId) : null,
      taskRepository.getBoardIdFromColumn(columnId)
    ])

    const updatedTask = await taskRepository.update(taskId, {
      position: newPosition,
      columnId,
    }, version)

    if (needsRebalancing(newPosition)) {
      await taskRepository.rebalanceColumn(columnId)
    }

    const isCrossBoardMove = !!(oldBoardId && newBoardId && oldBoardId !== newBoardId)

    if (newBoardId && oldBoardId && oldColumnId) {
       eventBus.emitDomain('task.moved', {
        task: updatedTask,
        userId,
        oldBoardId,
        newBoardId,
        oldColumnId,
        isCrossBoard: isCrossBoardMove
       })
    }

    return updatedTask
  },

  copyTask: async (id: string, userId: string) => {
    const original = await taskRepository.findById(id)
    if (!original) throw new Error('Task not found')

    const lastPosition = await taskRepository.getLastPositionInColumn(original.columnId!)
    const position = generatePosition(lastPosition, null)

    const task = await taskRepository.create({
      title: `${original.title} (Copy)`,
      description: original.description ?? undefined,
      priority: original.priority as any,
      columnId: original.columnId!,
      position,
      coverImageUrl: original.coverImageUrl ?? undefined,
    })

    const boardId = await taskRepository.getBoardIdFromColumn(original.columnId!)
    if (boardId) {
      eventBus.emitDomain('task.created', { task, userId, boardId })
      eventBus.emitDomain('task.copied', { task, originalTaskId: id, userId, boardId })
    }

    return task
  },

  getAssignees: (taskId: string) => taskRepository.getAssignees(taskId),

  addAssignee: async (taskId: string, userId: string, actorId: string) => {
    const assignee = await taskRepository.addAssignee(taskId, userId, actorId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      eventBus.emitDomain('task.assignee.added', { taskId, userId, actorId, boardId, assignee })
    }
    return assignee
  },

  removeAssignee: async (taskId: string, userId: string, actorId: string) => {
    const assignee = await taskRepository.removeAssignee(taskId, userId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      eventBus.emitDomain('task.assignee.removed', { taskId, userId, actorId, boardId })
    }
    return assignee
  },
}
