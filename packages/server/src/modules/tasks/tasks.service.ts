import { taskRepository } from './tasks.repository'
import { wsManager } from '../../websocket/manager'
import { generatePosition, needsRebalancing } from '../../shared/position'

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
  }) => {
    let position = data.position
    if (!position) {
      const lastPosition = await taskRepository.getLastPositionInColumn(data.columnId)
      position = generatePosition(lastPosition, null)
    }

    const task = await taskRepository.create({ ...data, position })
    const boardId = await taskRepository.getBoardIdFromColumn(data.columnId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:created', columnId: data.columnId })
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
  }) => {
    const task = await taskRepository.update(id, data)
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:updated', columnId: task.columnId })
    }
    return task
  },

  archiveTask: async (id: string) => {
    const task = await taskRepository.archive(id)
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:archived', data: task })
    }
    return task
  },

  restoreTask: async (id: string) => {
    const task = await taskRepository.restore(id)
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:restored', data: task })
    }
    return task
  },

  deleteTask: async (id: string) => {
    const task = await taskRepository.delete(id)
    if (task.columnId) {
      const boardId = await taskRepository.getBoardIdFromColumn(task.columnId)
      if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:deleted', columnId: task.columnId })
    }
    return task
  },

  moveTask: async (
    taskId: string,
    targetColumnId?: string,
    beforeTaskId?: string,
    afterTaskId?: string
  ) => {
    const task = await taskRepository.findById(taskId)
    if (!task) throw new Error('Task not found')

    const columnId = targetColumnId ?? task.columnId
    if (!columnId) throw new Error('No target column')

    // Get positions of adjacent tasks
    const { before, after } = await taskRepository.getPositionBetween(columnId, beforeTaskId, afterTaskId)

    // Generate new position between the two
    const newPosition = generatePosition(before, after)

    // Update task with new position and column
    const updatedTask = await taskRepository.update(taskId, {
      position: newPosition,
      columnId,
    })

    // Check if rebalancing is needed
    if (needsRebalancing(newPosition)) {
      await taskRepository.rebalanceColumn(columnId)
    }

    // Broadcast update
    const boardId = await taskRepository.getBoardIdFromColumn(columnId)
    if (boardId) {
      wsManager.broadcast(`board:${boardId}`, { type: 'task:moved', data: updatedTask })
    }

    return updatedTask
  },

  // Assignees
  getAssignees: (taskId: string) => taskRepository.getAssignees(taskId),

  addAssignee: async (taskId: string, userId: string, assignedBy?: string) => {
    const assignee = await taskRepository.addAssignee(taskId, userId, assignedBy)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:assignee:added', data: assignee })
    return assignee
  },

  removeAssignee: async (taskId: string, userId: string) => {
    const assignee = await taskRepository.removeAssignee(taskId, userId)
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) wsManager.broadcast(`board:${boardId}`, { type: 'task:assignee:removed', data: { taskId, userId } })
    return assignee
  },
}
