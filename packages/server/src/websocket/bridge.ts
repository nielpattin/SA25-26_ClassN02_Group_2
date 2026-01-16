import { eventBus } from '../events/bus'
import { wsManager } from './manager'

export function initWebSocketBridge() {
  eventBus.onDomain('task.created', ({ task, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:created', columnId: task.columnId })
  })
  
  eventBus.onDomain('task.updated', ({ task, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:updated', data: { id: task.id } })
  })

  eventBus.onDomain('task.moved', ({ task, oldBoardId, newBoardId, isCrossBoard, oldColumnId }) => {
    if (isCrossBoard) {
      wsManager.broadcast(`board:${oldBoardId}`, { 
        type: 'task:deleted', 
        data: task, 
        columnId: oldColumnId 
      })
      wsManager.broadcast(`board:${newBoardId}`, { 
        type: 'task:created', 
        data: task, 
        columnId: task.columnId 
      })
    } else {
      wsManager.broadcast(`board:${newBoardId}`, { 
        type: 'task:moved', 
        data: task, 
        columnId: task.columnId 
      })
    }
  })

  eventBus.onDomain('task.archived', ({ task, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:archived', data: task })
  })
  
  eventBus.onDomain('task.restored', ({ task, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:restored', data: task })
  })

  eventBus.onDomain('task.deleted', ({ task, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:deleted', columnId: task.columnId ?? '' })
  })

  eventBus.onDomain('task.assignee.added', ({ assignee, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:assignee:added', data: assignee })
  })

  eventBus.onDomain('task.assignee.removed', ({ taskId, userId, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:assignee:removed', data: { taskId, userId } })
  })

  eventBus.onDomain('column.created', ({ column, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'column:created', data: column })
  })
  
  eventBus.onDomain('column.updated', ({ column, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'column:updated', data: column })
  })

  eventBus.onDomain('column.moved', ({ column, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'column:moved', data: column })
  })

  eventBus.onDomain('column.deleted', ({ columnId, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'column:deleted', data: { id: columnId } })
  })

  eventBus.onDomain('board.created', ({ board }) => {
    wsManager.broadcast(`board:${board.id}`, { type: 'board:created', data: board })
  })

  eventBus.onDomain('board.updated', ({ board }) => {
    wsManager.broadcast(`board:${board.id}`, { type: 'board:updated', data: board })
  })
  
  eventBus.onDomain('board.archived', ({ board }) => {
    wsManager.broadcast(`board:${board.id}`, { type: 'board:archived', data: board })
  })
  
  eventBus.onDomain('board.restored', ({ board }) => {
    wsManager.broadcast(`board:${board.id}`, { type: 'board:restored', data: board })
  })
  
  eventBus.onDomain('board.deleted', ({ boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'board:deleted', data: { id: boardId } })
  })

  eventBus.onDomain('board.member.added', ({ boardId, member }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'board:member:added', data: member })
  })
  
  eventBus.onDomain('board.member.updated', ({ boardId, member }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'board:member:updated', data: member })
  })

  eventBus.onDomain('board.member.removed', ({ boardId, userId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'board:member:removed', data: { boardId, userId } })
  })

  eventBus.onDomain('attachment.added', ({ attachment, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:updated', data: { id: attachment.taskId } })
  })

  eventBus.onDomain('attachment.deleted', ({ taskId, boardId }) => {
    wsManager.broadcast(`board:${boardId}`, { type: 'task:updated', data: { id: taskId } })
  })
}
