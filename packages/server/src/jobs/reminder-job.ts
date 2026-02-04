import { taskRepository } from '../modules/tasks/tasks.repository'
import { notificationService } from '../modules/notifications/notifications.service'
import { notificationRepository } from '../modules/notifications/notifications.repository'
import { emailService } from '../modules/email/email.service'
import { dueSoonTemplate, overdueTemplate } from '../modules/email/templates'
import { db } from '../db'
import { taskAssignees, users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { logger } from '../shared/logger'

const log = logger.child({ job: 'reminder' })

export const runReminderJob = async () => {
  log.debug('Starting execution')
  try {
    await processDueSoonReminders()
    await processOverdueReminders()
    log.debug('Finished execution')
  } catch (error) {
    log.error('Job failed', { error: error instanceof Error ? error.message : String(error) })
  }
}

async function processDueSoonReminders() {
  const tasks = await taskRepository.findTasksNeedingReminders()
  let notifiedCount = 0

  for (const task of tasks) {
    if (!task.dueDate) continue

    const assignees = await getAssignees(task.id)
    let taskProcessed = false

    for (const assignee of assignees) {
      if (await notificationRepository.exists(assignee.id, task.id, 'due_soon')) {
        continue
      }

      if (isTriggered(task.dueDate, task.reminder, assignee.timezone)) {
        const prefs = assignee.notificationPreferences as any
        
        if (prefs?.due_soon?.inApp) {
          await notificationService.create({
            userId: assignee.id,
            type: 'due_soon',
            title: 'Task Due Soon',
            body: `"${task.title}" is due soon.`,
            resourceType: 'task',
            resourceId: task.id,
            taskId: task.id,
          })
        }

        if (prefs?.due_soon?.email) {
          const timing = getTimingLabel(task.reminder)
          const dueDateFormatted = formatDueDate(task.dueDate, assignee.timezone)

          await emailService.sendEmail({
            to: assignee.email,
            subject: `Due Soon: ${task.title}`,
            html: dueSoonTemplate({
              taskTitle: task.title,
              dueDate: dueDateFormatted,
              boardName: task.boardName,
              taskLink: getTaskLink(task.boardId, task.id),
              timing
            })
          })
        }
        
        taskProcessed = true
        notifiedCount++
      }
    }

    if (taskProcessed) {
      await taskRepository.update(task.id, { reminderSentAt: new Date() })
    }
  }
  if (notifiedCount > 0) log.info('Notified assignees about upcoming tasks', { count: notifiedCount })
}

async function processOverdueReminders() {
  const tasks = await taskRepository.findOverdueTasks()
  let notifiedCount = 0

  for (const task of tasks) {
    if (!task.dueDate) continue

    const assignees = await getAssignees(task.id)
    let taskProcessed = false

    for (const assignee of assignees) {
      if (await notificationRepository.exists(assignee.id, task.id, 'overdue')) {
        continue
      }

      const prefs = assignee.notificationPreferences as any
      
      if (prefs?.overdue?.inApp) {
        await notificationService.create({
          userId: assignee.id,
          type: 'overdue',
          title: 'Task Overdue',
          body: `"${task.title}" is overdue!`,
          resourceType: 'task',
          resourceId: task.id,
          taskId: task.id,
        })
      }

      if (prefs?.overdue?.email) {
        const dueDateFormatted = formatDueDate(task.dueDate, assignee.timezone)
        const daysPastDue = Math.floor((Date.now() - task.dueDate.getTime()) / (1000 * 60 * 60 * 24))

        await emailService.sendEmail({
          to: assignee.email,
          subject: `OVERDUE: ${task.title}`,
          html: overdueTemplate({
            taskTitle: task.title,
            dueDate: dueDateFormatted,
            boardName: task.boardName,
            taskLink: getTaskLink(task.boardId, task.id),
            daysPastDue: Math.max(1, daysPastDue)
          })
        })
      }
      
      taskProcessed = true
      notifiedCount++
    }

    if (taskProcessed) {
      await taskRepository.update(task.id, { overdueSentAt: new Date() })
    }
  }
  if (notifiedCount > 0) log.info('Notified assignees about overdue tasks', { count: notifiedCount })
}

async function getAssignees(taskId: string) {
  return db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    timezone: users.timezone,
    notificationPreferences: users.notificationPreferences,
  })
    .from(taskAssignees)
    .innerJoin(users, eq(taskAssignees.userId, users.id))
    .where(eq(taskAssignees.taskId, taskId))
}

function getTaskLink(boardId: string, taskId: string) {
  return `${process.env.WEB_URL || 'http://localhost:5173'}/board/${boardId}?cardId=${taskId}`
}

function formatDueDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone
  }).format(date)
}

function getUserParts(date: Date, timezone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      hour12: false
    }).formatToParts(date)
    
    const map: any = {}
    parts.forEach(p => map[p.type] = p.value)
    return {
      year: parseInt(map.year),
      month: parseInt(map.month),
      day: parseInt(map.day),
      hour: parseInt(map.hour)
    }
  } catch (e) {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours()
    }
  }
}

function isTriggered(dueDate: Date, reminder: string, timezone: string): boolean {
  const now = new Date()
  
  const triggerDate = new Date(dueDate)
  if (reminder === '1_day') triggerDate.setDate(triggerDate.getDate() - 1)
  else if (reminder === '2_days') triggerDate.setDate(triggerDate.getDate() - 2)
  else if (reminder === '1_week') triggerDate.setDate(triggerDate.getDate() - 7)
  
  const triggerParts = getUserParts(triggerDate, timezone)
  const nowParts = getUserParts(now, timezone)
  
  if (nowParts.year > triggerParts.year) return true
  if (nowParts.year < triggerParts.year) return false
  
  if (nowParts.month > triggerParts.month) return true
  if (nowParts.month < triggerParts.month) return false
  
  if (nowParts.day > triggerParts.day) return true
  if (nowParts.day < triggerParts.day) return false
  
  return nowParts.hour >= 9
}

function getTimingLabel(reminder: string): string {
  switch (reminder) {
    case 'on_day': return 'today'
    case '1_day': return 'tomorrow'
    case '2_days': return 'in 2 days'
    case '1_week': return 'in 1 week'
    default: return 'soon'
  }
}
