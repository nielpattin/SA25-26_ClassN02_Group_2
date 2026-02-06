import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { users } from '../../db/schema'
import { eventBus } from '../../events/bus'
import { activityService } from './activities.service'

export function initActivitySubscriber() {
  eventBus.onDomain('task.created', ({ task, userId, boardId }) => {
    activityService.log({
      boardId, taskId: task.id, userId, action: 'created',
      targetType: 'task', targetId: task.id
    })
  })

  eventBus.onDomain('task.updated', ({ task, userId, boardId, changes }) => {
    if (Object.keys(changes).length > 0) {
      activityService.log({
        boardId, taskId: task.id, userId, action: 'updated',
        targetType: 'task', targetId: task.id, changes
      })
    }
  })

  eventBus.onDomain('task.moved', ({ task, userId, newBoardId, oldColumnId, isCrossBoard, oldBoardId }) => {
    activityService.log({
      boardId: newBoardId, taskId: task.id, userId, action: 'moved',
      targetType: 'task', targetId: task.id,
      changes: { 
        columnId: { before: oldColumnId, after: task.columnId },
        ...(isCrossBoard && { boardId: { before: oldBoardId, after: newBoardId } })
      }
    })

    if (isCrossBoard) {
      activityService.log({
        boardId: oldBoardId, taskId: task.id, userId, action: 'moved_out',
        targetType: 'task', targetId: task.id,
        changes: { 
           boardId: { before: oldBoardId, after: newBoardId } 
        }
      })
    }
  })

  eventBus.onDomain('task.archived', ({ task, userId, boardId }) => {
    activityService.log({
      boardId, taskId: task.id, userId, action: 'archived',
      targetType: 'task', targetId: task.id
    })
  })

  eventBus.onDomain('task.restored', ({ task, userId, boardId }) => {
    activityService.log({
      boardId, taskId: task.id, userId, action: 'restored',
      targetType: 'task', targetId: task.id
    })
  })

  eventBus.onDomain('task.deleted', ({ task, userId, boardId }) => {
    activityService.log({
      boardId, userId, action: 'deleted',
      targetType: 'task', targetId: task.id
    })
  })

  eventBus.onDomain('column.archived', ({ column, userId, boardId }) => {
    activityService.log({
      boardId, userId, action: 'archived',
      targetType: 'column', targetId: column.id,
      changes: { name: column.name }
    })
  })

  eventBus.onDomain('column.restored', ({ column, userId, boardId }) => {
    activityService.log({
      boardId, userId, action: 'restored',
      targetType: 'column', targetId: column.id,
      changes: { name: column.name }
    })
  })

  eventBus.onDomain('column.deleted', ({ columnId, userId, boardId }) => {
    activityService.log({
      boardId, userId, action: 'deleted',
      targetType: 'column', targetId: columnId
    })
  })

  eventBus.onDomain('board.archived', ({ board, userId }) => {
    activityService.log({
      boardId: board.id, userId, action: 'archived',
      targetType: 'board', targetId: board.id,
      changes: { name: board.name }
    })
  })

  eventBus.onDomain('board.restored', ({ board, userId }) => {
    activityService.log({
      boardId: board.id, userId, action: 'restored',
      targetType: 'board', targetId: board.id,
      changes: { name: board.name }
    })
  })

  eventBus.onDomain('board.deleted', ({ boardId, userId }) => {
    activityService.log({
      boardId, userId, action: 'deleted',
      targetType: 'board', targetId: boardId
    })
  })

  eventBus.onDomain('task.assignee.added', async ({ taskId, userId, actorId, boardId }) => {
    const user = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).then(r => r[0])
    activityService.log({
      boardId, taskId, userId: actorId, action: 'assigned',
      targetType: 'user', targetId: userId,
      changes: { userName: user?.name }
    })
  })

  eventBus.onDomain('task.assignee.removed', async ({ taskId, userId, actorId, boardId }) => {
    const user = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).then(r => r[0])
    activityService.log({
      boardId, taskId, userId: actorId, action: 'unassigned',
      targetType: 'user', targetId: userId,
      changes: { userName: user?.name }
    })
  })

  eventBus.onDomain('label.added', ({ taskId, userId, boardId, labelId, labelName }) => {
    activityService.log({
      boardId, taskId, userId, action: 'label_added',
      targetType: 'label', targetId: labelId,
      changes: { name: labelName }
    })
  })

  eventBus.onDomain('label.removed', ({ taskId, userId, boardId, labelId, labelName }) => {
    activityService.log({
      boardId, taskId, userId, action: 'label_removed',
      targetType: 'label', targetId: labelId,
      changes: { name: labelName }
    })
  })

  eventBus.onDomain('attachment.added', ({ attachment, userId, boardId }) => {
    activityService.log({
      boardId, taskId: attachment.taskId, userId, action: 'attachment_added',
      targetType: 'attachment', targetId: attachment.id,
      changes: { name: attachment.name }
    })
  })

  eventBus.onDomain('checklist.created', ({ checklist, taskId, userId, boardId }) => {
    activityService.log({
      boardId, taskId, userId, action: 'created',
      targetType: 'checklist', targetId: checklist.id,
      changes: { title: checklist.title }
    })
  })

  eventBus.onDomain('checklist.updated', ({ checklist, taskId, userId, boardId, changes }) => {
    activityService.log({
      boardId, taskId, userId, action: 'updated',
      targetType: 'checklist', targetId: checklist.id,
      changes: { ...changes, title: changes.title ?? checklist.title }
    })
  })

  eventBus.onDomain('checklist.deleted', ({ checklist, taskId, userId, boardId }) => {
    activityService.log({
      boardId, taskId, userId, action: 'deleted',
      targetType: 'checklist', targetId: checklist.id,
      changes: { title: checklist.title }
    })
  })

  eventBus.onDomain('checklist.item.created', ({ item, taskId, userId, boardId }) => {
    activityService.log({
      boardId, taskId, userId, action: 'created',
      targetType: 'checklist_item', targetId: item.id,
      changes: { content: item.content }
    })
  })

  eventBus.onDomain('checklist.item.updated', ({ item, taskId, userId, boardId, changes }) => {
    let action: 'completed' | 'uncompleted' | 'updated' = 'updated'
    if (changes.isCompleted !== undefined) {
      action = item.isCompleted ? 'completed' : 'uncompleted'
    }
    
    activityService.log({
      boardId, taskId, userId, action,
      targetType: 'checklist_item', targetId: item.id,
      changes: { ...changes, content: item.content }
    })
  })

  eventBus.onDomain('checklist.item.deleted', ({ item, taskId, userId, boardId }) => {
    activityService.log({
      boardId, taskId, userId, action: 'deleted',
      targetType: 'checklist_item', targetId: item.id,
      changes: { content: item.content }
    })
  })

  eventBus.onDomain('comment.created', ({ comment, boardId, userId }) => {
    activityService.log({
      boardId, taskId: comment.taskId, userId, action: 'created',
      targetType: 'comment', targetId: comment.id
    })
  })

  eventBus.onDomain('comment.updated', ({ comment, boardId, userId }) => {
    activityService.log({
      boardId, taskId: comment.taskId, userId, action: 'updated',
      targetType: 'comment', targetId: comment.id
    })
  })

  eventBus.onDomain('comment.deleted', ({ commentId, boardId, userId }) => {
    activityService.log({
      boardId, userId, action: 'deleted',
      targetType: 'comment', targetId: commentId
    })
  })
}
