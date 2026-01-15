import { taskRepository } from './tasks.repository'
import { wsManager } from '../../websocket/manager'
import { generatePosition, needsRebalancing } from '../../shared/position'
import { activityService } from '../activities/activities.service'

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
      wsManager.broadcast(`board:${boardId}`, { type: 'task:created', columnId: data.columnId })
      await activityService.log({
        boardId,
        taskId: task.id,
        userId,
        action: 'created',
        targetType: 'task',
        targetId: task.id,
      })
    }
    
    return task
  },

  updateTask: async (id: string, data: {
    title?: string
    description?: string
    position?: string
    columnId?: string
    priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null
    dueDate?: Date | null
    coverImageUrl?: string | null
  }, userId: string) => {
    const oldTask = await taskRepository.findById(id)
    const task = await taskRepository.update(id, data)
    
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) {
        wsManager.broadcast(`board:${boardId}`, { 
          type: 'task:updated', 
          columnId: task.columnId,
          data: { id: task.id }
        })
        
        // Log changes
        const changes: any = {}
        if (data.title && data.title !== oldTask?.title) changes.title = { before: oldTask?.title, after: data.title }
        if (data.description !== undefined && data.description !== oldTask?.description) changes.description = { before: oldTask?.description, after: data.description }
        if (data.priority && data.priority !== oldTask?.priority) changes.priority = { before: oldTask?.priority, after: data.priority }
        if (data.dueDate !== undefined && data.dueDate?.getTime() !== oldTask?.dueDate?.getTime()) changes.dueDate = { before: oldTask?.dueDate, after: data.dueDate }
        if (data.coverImageUrl !== undefined && data.coverImageUrl !== oldTask?.coverImageUrl) changes.coverImageUrl = { before: oldTask?.coverImageUrl, after: data.coverImageUrl }

        if (Object.keys(changes).length > 0) {
          await activityService.log({
            boardId,
            taskId: id,
            userId,
            action: 'updated',
            targetType: 'task',
            targetId: id,
            changes,
          })
        }
      }
    }
    return task
  },

  archiveTask: async (id: string, userId: string) => {
    const task = await taskRepository.archive(id)
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) {
        wsManager.broadcast(`board:${boardId}`, { type: 'task:archived', data: task })
        await activityService.log({
          boardId: boardId,
          taskId: id,
          userId,
          action: 'archived',
          targetType: 'task',
          targetId: id,
        })
      }
    }
    return task
  },

  restoreTask: async (id: string, userId: string) => {
    const task = await taskRepository.restore(id)
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) {
        wsManager.broadcast(`board:${boardId}`, { type: 'task:restored', data: task })
        await activityService.log({
          boardId: boardId,
          taskId: id,
          userId,
          action: 'restored',
          targetType: 'task',
          targetId: id,
        })
      }
    }
    return task
  },

  deleteTask: async (id: string, userId: string) => {
    const boardId = await taskRepository.getBoardIdFromTask(id)
    const task = await taskRepository.delete(id)
    const bId = boardId || (task.columnId ? await taskRepository.getBoardIdFromColumn(task.columnId) : null)
    
    if (bId) {
      wsManager.broadcast(`board:${bId}`, { type: 'task:deleted', columnId: task.columnId ?? '' })
      await activityService.log({
        boardId: bId,
        userId,
        action: 'deleted',
        targetType: 'task',
        targetId: id,
      })
    }
    
    return task
  },

  moveTask: async (
    taskId: string,
    userId: string,
    targetColumnId?: string,
    beforeTaskId?: string,
    afterTaskId?: string
  ) => {
    const task = await taskRepository.findById(taskId)
    if (!task) throw new Error('Task not found')

    const oldColumnId = task.columnId
    const columnId = targetColumnId ?? task.columnId
    if (!columnId) throw new Error('No target column')

    // Get positions of adjacent tasks
    const { before, after } = await taskRepository.getPositionBetween(columnId, beforeTaskId, afterTaskId)

    // Generate new position between the two
    const newPosition = generatePosition(before, after)

    // Get board IDs for both old and new columns
    const [oldBoardId, newBoardId] = await Promise.all([
      oldColumnId ? taskRepository.getBoardIdFromColumn(oldColumnId) : null,
      taskRepository.getBoardIdFromColumn(columnId)
    ])

    // Update task with new position and column
    const updatedTask = await taskRepository.update(taskId, {
      position: newPosition,
      columnId,
    })

    // Check if rebalancing is needed
    if (needsRebalancing(newPosition)) {
      await taskRepository.rebalanceColumn(columnId)
    }

    // Check if we're moving between different boards
    const isCrossBoardMove = oldBoardId && newBoardId && oldBoardId !== newBoardId

    // Broadcast updates
    if (oldBoardId) {
      wsManager.broadcast(`board:${oldBoardId}`, { 
        type: isCrossBoardMove ? 'task:deleted' : 'task:moved', 
        data: updatedTask,
        columnId: oldColumnId 
      })
    }

    if (newBoardId && isCrossBoardMove) {
      wsManager.broadcast(`board:${newBoardId}`, { 
        type: 'task:created', 
        data: updatedTask,
        columnId 
      })
    } else if (newBoardId && !oldBoardId) {
       wsManager.broadcast(`board:${newBoardId}`, { 
        type: 'task:created', 
        data: updatedTask,
        columnId 
      })
    }

    // Activity logging
    if (newBoardId) {
      if (oldColumnId !== columnId) {
        await activityService.log({
          boardId: newBoardId,
          taskId,
          userId,
          action: 'moved',
          targetType: 'task',
          targetId: taskId,
          changes: { 
            columnId: { before: oldColumnId, after: columnId },
            ...(isCrossBoardMove && { boardId: { before: oldBoardId, after: newBoardId } })
          }
        })

        if (isCrossBoardMove && oldBoardId) {
          await activityService.log({
            boardId: oldBoardId,
            taskId,
            userId,
            action: 'moved_out',
            targetType: 'task',
            targetId: taskId,
            changes: { 
              columnId: { before: oldColumnId, after: columnId },
              boardId: { before: oldBoardId, after: newBoardId }
            }
          })
        }
      }
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
      wsManager.broadcast(`board:${boardId}`, { type: 'task:created', columnId: original.columnId })
      await activityService.log({
        boardId,
        taskId: task.id,
        userId,
        action: 'created',
        targetType: 'task',
        targetId: task.id,
      })
    }

    return task
  },

  // Assignees
  getAssignees: (taskId: string) => taskRepository.getAssignees(taskId),

  addAssignee: async (taskId: string, userId: string, actorId: string) => {
    const assignee = await taskRepository.addAssignee(taskId, userId, actorId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      wsManager.broadcast(`board:${boardId}`, { type: 'task:assignee:added', data: assignee })
      await activityService.log({
        boardId,
        taskId,
        userId: actorId,
        action: 'assigned',
        targetType: 'user',
        targetId: userId,
      })
    }
    return assignee
  },

  removeAssignee: async (taskId: string, userId: string, actorId: string) => {
    const assignee = await taskRepository.removeAssignee(taskId, userId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      wsManager.broadcast(`board:${boardId}`, { type: 'task:assignee:removed', data: { taskId, userId } })
      await activityService.log({
        boardId,
        taskId,
        userId: actorId,
        action: 'unassigned',
        targetType: 'user',
        targetId: userId,
      })
    }
    return assignee
  },
}
