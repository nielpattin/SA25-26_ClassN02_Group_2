import { eventBus } from '../../events/bus'
import { notificationService } from './notifications.service'
import { taskRepository } from '../tasks/tasks.repository'
import { userRepository } from '../users/users.repository'
import { boardRepository } from '../boards/boards.repository'
import { 
  emailService, 
  boardInviteTemplate, 
  taskAssignmentTemplate, 
  mentionTemplate, 
  commentTemplate 
} from '../email'
import type { User } from '../users/users.model'

const baseUrl = process.env.WEB_URL || 'http://localhost:5173'

export function initNotificationSubscriber() {
  eventBus.onDomain('task.assignee.added', async ({ taskId, userId, actorId, boardId }) => {
    if (userId === actorId) return
    
    const [task, actor, targetUser, board] = await Promise.all([
      taskRepository.findById(taskId),
      userRepository.getById(actorId),
      userRepository.getById(userId),
      boardRepository.findById(boardId)
    ])
    
    await notificationService.create({
      userId,
      type: 'assignment',
      title: `${actor?.name ?? 'Someone'} assigned you to "${task?.title}"`,
      taskId,
      boardId
    })

    const targetPrefs = targetUser?.notificationPreferences as Record<string, { email: boolean; inApp: boolean }> | null
    if (targetUser?.email && targetPrefs?.assignment?.email) {
      emailService.sendEmail({
        to: targetUser.email,
        subject: `Assigned to task: ${task?.title}`,
        html: taskAssignmentTemplate({
          assignerName: actor?.name ?? 'Someone',
          taskTitle: task?.title ?? 'Untitled Task',
          boardName: board?.name ?? 'Board',
          taskLink: `${baseUrl}/board/${boardId}?cardId=${taskId}`
        })
      }).catch(err => console.error('Failed to send assignment email:', err))
    }
  })

  eventBus.onDomain('board.member.added', async ({ boardId, userId, actorId }) => {
    if (userId === actorId) return
    
    const [board, actor, targetUser] = await Promise.all([
      boardRepository.findById(boardId),
      userRepository.getById(actorId),
      userRepository.getById(userId)
    ])
    
    await notificationService.create({
      userId,
      type: 'board_invite',
      title: `${actor?.name ?? 'Someone'} added you to "${board?.name}"`,
      boardId
    })

    const targetPrefs = targetUser?.notificationPreferences as Record<string, { email: boolean; inApp: boolean }> | null
    if (targetUser?.email && targetPrefs?.board_invite?.email) {
      emailService.sendEmail({
        to: targetUser.email,
        subject: `Invited to board: ${board?.name}`,
        html: boardInviteTemplate({
          inviterName: actor?.name ?? 'Someone',
          boardName: board?.name ?? 'Board',
          inviteLink: `${baseUrl}/board/${boardId}`
        })
      }).catch(err => console.error('Failed to send board invite email:', err))
    }
  })

  eventBus.onDomain('comment.mention', async ({ mentionedUserId, comment, actorId, taskId, boardId }) => {
    if (mentionedUserId === actorId) return
    
    const [actor, targetUser, task] = await Promise.all([
      userRepository.getById(actorId),
      userRepository.getById(mentionedUserId),
      taskRepository.findById(taskId)
    ])
    
    await notificationService.create({
      userId: mentionedUserId,
      type: 'mention',
      title: `${actor?.name ?? 'Someone'} mentioned you in a comment`,
      body: comment.content.substring(0, 100),
      taskId,
      boardId
    })

    const targetPrefs = targetUser?.notificationPreferences as Record<string, { email: boolean; inApp: boolean }> | null
    if (targetUser?.email && targetPrefs?.mention?.email) {
      emailService.sendEmail({
        to: targetUser.email,
        subject: `Mentioned in ${task?.title}`,
        html: mentionTemplate({
          mentionerName: actor?.name ?? 'Someone',
          taskTitle: task?.title ?? 'Task',
          commentContent: comment.content,
          taskLink: `${baseUrl}/board/${boardId}?cardId=${taskId}`
        })
      }).catch(err => console.error('Failed to send mention email:', err))
    }
  })

  eventBus.onDomain('comment.created', async ({ comment, boardId, userId }) => {
    const task = await taskRepository.findById(comment.taskId)
    if (!task) return
    
    const [assignees, actor] = await Promise.all([
      taskRepository.getAssignees(comment.taskId),
      userRepository.getById(userId)
    ])
    
    const notifyAssignees = assignees.filter(a => a.userId !== userId)
    
    await Promise.all(notifyAssignees.map(async (assignee) => {
      await notificationService.create({
        userId: assignee.userId,
        type: 'comment',
        title: `${actor?.name ?? 'Someone'} commented on "${task.title}"`,
        body: comment.content.substring(0, 100),
        taskId: comment.taskId,
        boardId
      })

      const targetUser = await userRepository.getById(assignee.userId)
      const targetPrefs = targetUser?.notificationPreferences as Record<string, { email: boolean; inApp: boolean }> | null
      if (targetUser?.email && targetPrefs?.comment?.email) {
        emailService.sendEmail({
          to: targetUser.email,
          subject: `New comment on ${task.title}`,
          html: commentTemplate({
            authorName: actor?.name ?? 'Someone',
            taskTitle: task.title,
            commentContent: comment.content,
            taskLink: `${baseUrl}/board/${boardId}?cardId=${comment.taskId}`
          })
        }).catch(err => console.error('Failed to send comment email:', err))
      }
    }))
  })

  eventBus.onDomain('template.approved', async ({ template, adminId }) => {
    if (!template.createdBy) return
    
    await notificationService.create({
      userId: template.createdBy,
      type: 'template_status',
      title: `Template Approved: ${template.name}`,
      body: 'Your template has been approved and is now visible in the marketplace.',
      resourceType: 'template',
      resourceId: template.id
    })
  })

  eventBus.onDomain('template.rejected', async ({ template, adminId, reason, comment }) => {
    if (!template.createdBy) return
    
    await notificationService.create({
      userId: template.createdBy,
      type: 'template_status',
      title: `Template Rejected: ${template.name}`,
      body: reason ? `Reason: ${reason}` : 'Your template submission was not approved.',
      resourceType: 'template',
      resourceId: template.id
    })
  })

  eventBus.onDomain('template.removed', async ({ template, adminId }) => {
    if (!template.createdBy) return
    
    await notificationService.create({
      userId: template.createdBy,
      type: 'template_status',
      title: `Template Removed: ${template.name}`,
      body: 'Your template has been removed from the marketplace.',
      resourceType: 'template',
      resourceId: template.id
    })
  })
}
