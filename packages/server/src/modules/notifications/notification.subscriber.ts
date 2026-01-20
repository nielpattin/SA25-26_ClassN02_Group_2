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
      title: `${actor?.name ?? 'Someone'} assigned you to "${task?.title}"`,
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
      title: `${actor?.name ?? 'Someone'} added you to "${board?.name}"`,
      boardId
    })
  })

  eventBus.onDomain('comment.mention', async ({ mentionedUserId, comment, actorId, taskId, boardId }) => {
    if (mentionedUserId === actorId) return
    
    const actor = await userRepository.getById(actorId)
    
    await notificationService.create({
      userId: mentionedUserId,
      type: 'mention',
      title: `${actor?.name ?? 'Someone'} mentioned you in a comment`,
      body: comment.content.substring(0, 100),
      taskId,
      boardId
    })
  })

  eventBus.onDomain('comment.created', async ({ comment, boardId, userId }) => {
    const task = await taskRepository.findById(comment.taskId)
    if (!task) return
    
    const [assignees, actor] = await Promise.all([
      taskRepository.getAssignees(comment.taskId),
      userRepository.getById(userId)
    ])
    
    const notifyAssignees = assignees.filter(a => a.userId !== userId)
    
    await Promise.all(notifyAssignees.map(assignee =>
      notificationService.create({
        userId: assignee.userId,
        type: 'comment',
        title: `${actor?.name ?? 'Someone'} commented on "${task.title}"`,
        body: comment.content.substring(0, 100),
        taskId: comment.taskId,
        boardId
      })
    ))
  })
}
