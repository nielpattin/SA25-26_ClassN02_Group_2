import { describe, test, expect, beforeAll, afterAll, beforeEach, spyOn, mock } from 'bun:test'
import { runReminderJob } from '../jobs/reminder-job'
import { taskRepository } from '../modules/tasks/tasks.repository'
import { notificationService } from '../modules/notifications/notifications.service'
import { emailService } from '../modules/email/email.service'
import { db } from '../db'
import { tasks, users, taskAssignees, boards, columns, notifications } from '../db/schema'
import { eq } from 'drizzle-orm'
import { ensureTestUser, TEST_USER_ID } from './helpers'

describe('Reminder Job', () => {
  let boardId: string
  let columnId: string
  const userId = TEST_USER_ID

  beforeAll(async () => {
    await ensureTestUser(userId)
    
    // Update user with specific preferences and timezone
    await db.update(users).set({
      timezone: 'UTC',
      notificationPreferences: {
        due_soon: { inApp: true, email: true },
        overdue: { inApp: true, email: true }
      }
    }).where(eq(users.id, userId))
  })

  beforeEach(async () => {
    // Clear relevant tables before each test to avoid interference
    await db.delete(notifications)
    await db.delete(taskAssignees)
    await db.delete(tasks)
    await db.delete(columns)
    await db.delete(boards)

    // Re-create board and column for the current test
    const [board] = await db.insert(boards).values({ name: 'Test Board', position: 'a0' }).returning()
    boardId = board.id
    const [column] = await db.insert(columns).values({ name: 'Test Column', boardId, position: 'a0' }).returning()
    columnId = column.id
  })

  afterAll(async () => {
    // Cleanup
    await db.delete(notifications).where(eq(notifications.userId, userId))
    if (boardId) {
      await db.delete(boards).where(eq(boards.id, boardId))
    }
  })

  test('Task with reminder 1_day and due date tomorrow triggers notification', async () => {
    const createSpy = spyOn(notificationService, 'create')
    const emailSpy = spyOn(emailService, 'sendEmail').mockImplementation(async () => ({ success: true, data: { id: 'test' } } as any))

    // Set dueDate such that triggerDate is in the past (guaranteed trigger)
    const today = new Date()
    const task = await taskRepository.create({
      title: 'Due Soon Test',
      columnId,
      position: 'a1',
      dueDate: today,
      reminder: '1_day'
    })

    await db.insert(taskAssignees).values({ taskId: task.id, userId })

    await runReminderJob()

    expect(createSpy).toHaveBeenCalled()
    expect(emailSpy).toHaveBeenCalled()

    // Verify reminderSentAt is updated
    const updatedTask = await taskRepository.findById(task.id)
    expect(updatedTask?.reminderSentAt).not.toBeNull()

    createSpy.mockRestore()
    emailSpy.mockRestore()
  })

  test('Task with reminder none does not trigger notification', async () => {
    const createSpy = spyOn(notificationService, 'create')
    
    // Use future date to avoid overdue trigger
    const future = new Date()
    future.setDate(future.getDate() + 7)
    const task = await taskRepository.create({
      title: 'No Reminder Test',
      columnId,
      position: 'a2',
      dueDate: future,
      reminder: 'none'
    })

    await db.insert(taskAssignees).values({ taskId: task.id, userId })

    await runReminderJob()

    expect(createSpy).not.toHaveBeenCalled()
    createSpy.mockRestore()
  })

  test('Task with reminderSentAt >= dueDate does not trigger duplicate', async () => {
    const createSpy = spyOn(notificationService, 'create')
    
    const today = new Date()
    const task = await taskRepository.create({
      title: 'No Duplicate Test',
      columnId,
      position: 'a3',
      dueDate: today,
      reminder: '1_day'
    })
    
    // Set both to prevent both due_soon and overdue
    await taskRepository.update(task.id, { 
      reminderSentAt: new Date(),
      overdueSentAt: new Date()
    })

    await db.insert(taskAssignees).values({ taskId: task.id, userId })

    await runReminderJob()

    expect(createSpy).not.toHaveBeenCalled()
    createSpy.mockRestore()
  })

  test('Overdue task triggers overdue notification once', async () => {
    const createSpy = spyOn(notificationService, 'create')
    const emailSpy = spyOn(emailService, 'sendEmail').mockImplementation(async () => ({ success: true, data: { id: 'test' } } as any))

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const task = await taskRepository.create({
      title: 'Overdue Test',
      columnId,
      position: 'a4',
      dueDate: yesterday,
      reminder: 'none'
    })

    await db.insert(taskAssignees).values({ taskId: task.id, userId })

    await runReminderJob()

    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'overdue' }))
    expect(emailSpy).toHaveBeenCalled()

    const updatedTask = await taskRepository.findById(task.id)
    expect(updatedTask?.overdueSentAt).not.toBeNull()

    // Run again, should not trigger
    createSpy.mockClear()
    emailSpy.mockClear()
    await runReminderJob()
    expect(createSpy).not.toHaveBeenCalled()

    createSpy.mockRestore()
    emailSpy.mockRestore()
  })

  test('User with due_soon.email=false does not receive email', async () => {
    const secondUserId = '00000000-0000-4000-a000-000000000010'
    await ensureTestUser(secondUserId)
    await db.update(users).set({
      timezone: 'UTC',
      notificationPreferences: {
        due_soon: { inApp: true, email: false },
        overdue: { inApp: true, email: false }
      }
    }).where(eq(users.id, secondUserId))

    const createSpy = spyOn(notificationService, 'create')
    const emailSpy = spyOn(emailService, 'sendEmail').mockImplementation(async () => ({ success: true, data: { id: 'test' } } as any))

    const today = new Date()
    const task = await taskRepository.create({
      title: 'No Email Test',
      columnId,
      position: 'a5',
      dueDate: today,
      reminder: '1_day'
    })
    
    // Prevent overdue trigger to focus on due_soon preference
    await taskRepository.update(task.id, { overdueSentAt: new Date() })

    await db.insert(taskAssignees).values({ taskId: task.id, userId: secondUserId })

    await runReminderJob()

    expect(createSpy).toHaveBeenCalled()
    expect(emailSpy).not.toHaveBeenCalled()

    createSpy.mockRestore()
    emailSpy.mockRestore()
    await db.delete(users).where(eq(users.id, secondUserId))
  })
})
