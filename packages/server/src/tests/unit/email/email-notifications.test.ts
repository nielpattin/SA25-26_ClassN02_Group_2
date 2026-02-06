import { describe, test, expect, spyOn, beforeAll, afterAll, mock } from 'bun:test'

mock.module('resend', () => {
  return {
    Resend: class {
      emails = {
        send: mock(() => Promise.resolve({ data: { id: 'test-id' }, error: null }))
      }
    }
  }
})

import { emailService } from '../../../modules/email/email.service'
import { eventBus } from '../../../events/bus'
import { initNotificationSubscriber } from '../../../modules/notifications/notification.subscriber'
import { userRepository } from '../../../modules/users/users.repository'
import { taskRepository } from '../../../modules/tasks/tasks.repository'
import { boardRepository } from '../../../modules/boards/boards.repository'
import { notificationService } from '../../../modules/notifications/notifications.service'

const VALID_UUID_1 = '00000000-0000-4000-a000-000000000001'
const VALID_UUID_2 = '00000000-0000-4000-a000-000000000002'

initNotificationSubscriber()

describe('Email Notification Integration', () => {
  let sendSpy: any
  let createSpy: any
  let userSpy: any
  let taskSpy: any
  let boardSpy: any

  beforeAll(() => {
    sendSpy = spyOn(emailService, 'sendEmail').mockImplementation(() => Promise.resolve({ success: true, error: null } as any))
    createSpy = spyOn(notificationService, 'create').mockImplementation(() => Promise.resolve({} as any))
  })

  afterAll(() => {
    sendSpy.mockRestore()
    createSpy.mockRestore()
    userSpy?.mockRestore()
    taskSpy?.mockRestore()
    boardSpy?.mockRestore()
  })

  test('should send email when preference is true', async () => {
    sendSpy.mockClear()
    
    const mockUser = {
      id: VALID_UUID_1,
      email: 'test@example.com',
      notificationPreferences: {
        assignment: { email: true }
      }
    }
    const mockTask = { id: VALID_UUID_2, title: 'Test Task' }
    const mockActor = { id: 'actor-1', name: 'Actor' }
    const mockBoard = { id: VALID_UUID_1, name: 'Board' }

    userSpy = spyOn(userRepository, 'getById').mockImplementation(async (id) => {
      if (id === VALID_UUID_1) return mockUser as any
      if (id === 'actor-1') return mockActor as any
      return null
    })
    taskSpy = spyOn(taskRepository, 'findById').mockImplementation(async () => mockTask as any)
    boardSpy = spyOn(boardRepository, 'findById').mockImplementation(async () => mockBoard as any)

    eventBus.emitDomain('task.assignee.added', {
      taskId: VALID_UUID_2,
      userId: VALID_UUID_1,
      actorId: 'actor-1',
      boardId: VALID_UUID_1,
      assignee: {} as any
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(sendSpy).toHaveBeenCalled()
  })

  test('should NOT send email when preference is false', async () => {
    sendSpy.mockClear()
    userSpy?.mockRestore()

    const mockUser = {
      id: VALID_UUID_2,
      email: 'test@example.com',
      notificationPreferences: {
        assignment: { email: false }
      }
    }

    userSpy = spyOn(userRepository, 'getById').mockImplementation(async (id) => {
      if (id === VALID_UUID_2) return mockUser as any
      return { id: 'actor-1', name: 'Actor' } as any
    })

    eventBus.emitDomain('task.assignee.added', {
      taskId: VALID_UUID_2,
      userId: VALID_UUID_2,
      actorId: 'actor-1',
      boardId: VALID_UUID_1,
      assignee: {} as any
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(sendSpy).not.toHaveBeenCalled()
  })
})
