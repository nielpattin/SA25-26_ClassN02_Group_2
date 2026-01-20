import { eventBus } from '../../events/bus'
import { notificationService } from './notifications.service'
import { taskRepository } from '../tasks/tasks.repository'
import { userRepository } from '../users/users.repository'
import { boardRepository } from '../boards/boards.repository'

export function initNotificationSubscriber() {
  eventBus.onDomain('task.assignee.added', async ({ taskId, userId, actorId, boardId }) => {
    if (userId === actorId) return
    
    const [task, actor] = await Promise.all([
      taskRepository.findById(taskId),
      userRepository.getById(actorId)
    ])
    
    await notificationService.create({
      userId,
      type: 'assignment',
      title: `${actor?.name} assigned you to "${task?.title}"`,
      taskId,
      boardId
    })
  })

  eventBus.onDomain('board.member.added', async ({ boardId, userId, actorId }) => {
    if (userId === actorId) return
    
    const [board, actor] = await Promise.all([
      boardRepository.findById(boardId),
      userRepository.getById(actorId)
    ])
    
    await notificationService.create({
      userId,
      type: 'board_invite',
      title: `${actor?.name} added you to "${board?.name}"`,
      boardId
    })
  })

  eventBus.onDomain('comment.mention', async ({ mentionedUserId, comment, actorId, taskId, boardId }) => {
    if (mentionedUserId === actorId) return
    
    const actor = await userRepository.getById(actorId)
    
    await notificationService.create({
      userId: mentionedUserId,
      type: 'mention',
      title: `${actor?.name} mentioned you in a comment`,
      body: comment.content.substring(0, 100),
      taskId,
      boardId
    })
  })

  eventBus.onDomain('comment.created', async ({ comment, boardId, userId }) => {
    const task = await taskRepository.findById(comment.taskId)
    if (!task) return
    
    const assignees = await taskRepository.getAssignees(comment.taskId)
    const actor = await userRepository.getById(userId)
    
    for (const assignee of assignees) {
      if (assignee.userId === userId) continue
      
      await notificationService.create({
        userId: assignee.userId,
        type: 'comment',
        title: `${actor?.name} commented on "${task.title}"`,
        body: comment.content.substring(0, 100),
        taskId: comment.taskId,
        boardId
      })
    }
  })
}
