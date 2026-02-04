import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authPlugin } from './modules/auth'
import { idempotencyPlugin } from './shared/middleware/idempotency'
import { requestLogger } from './shared/middleware/request-logger'
import { logger } from './shared/logger'
import { boardController } from './modules/boards'
import { columnController } from './modules/columns'
import { taskController } from './modules/tasks'
import { labelController } from './modules/labels'
import { checklistController } from './modules/checklists'
import { attachmentController } from './modules/attachments'
import { commentController } from './modules/comments'
import { taskDependencyController } from './modules/task-dependencies'
import { userController } from './modules/users'
import { workspaceController } from './modules/workspaces'
import { activityController } from './modules/activities'
import { templateController } from './modules/templates'
import { notificationController } from './modules/notifications'
import { searchController } from './modules/search'
import { configController } from './modules/config/config.controller'
import { adminController } from './modules/admin'
import { wsManager } from './websocket/manager'
import { initWebSocketBridge } from './websocket/bridge'
import { presenceManager } from './websocket/presence'
import { initActivitySubscriber } from './modules/activities/activity.subscriber'
import { initNotificationSubscriber } from './modules/notifications/notification.subscriber'
import { runReminderJob } from './jobs/reminder-job'

import { boardService } from './modules/boards/boards.service'
import { activityRepository } from './modules/activities/activities.repository'
import { AppError } from './shared/errors'

initWebSocketBridge()
initActivitySubscriber()
initNotificationSubscriber()

export const app = new Elysia()
  .use(requestLogger)
  .onError(({ code, error, set }) => {
    if (error instanceof AppError) {
      set.status = error.status
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }
    }

    if (code === 'VALIDATION') {
      set.status = 400
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.all
        }
      }
    }

    if (code === 'NOT_FOUND') {
      set.status = 404
      return {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found'
        }
      }
    }

    set.status = 500
    return {
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Something went wrong'
      }
    }
  })
  .use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  }))
  .use(authPlugin)
  .group('/v1', (v1) => v1
    .use(idempotencyPlugin)
    .use(boardController)
    .use(columnController)
    .use(taskController)
    .use(labelController)
    .use(checklistController)
    .use(attachmentController)
    .use(commentController)
    .use(taskDependencyController)
    .use(userController)
    .use(workspaceController)
    .use(activityController)
    .use(templateController)
    .use(notificationController)
    .use(searchController)
    .use(configController)
    .use(adminController)
  )
  .ws('/ws', {
    body: t.Object({
      type: t.String(),
      boardId: t.Optional(t.String()),
      userId: t.Optional(t.String()),
      since: t.Optional(t.String())
    }),
    close(ws) {
      const data = ws.data as any
      if (data.currentBoardId && data.session?.user?.id) {
        presenceManager.leave(data.currentBoardId, data.session.user.id)
      }
    },
    async message(ws, { type, boardId, userId, since }) {
      const authenticatedUserId = ws.data.session?.user.id
      const user = ws.data.session?.user

      if (type === 'subscribe') {
        if (boardId) {
          const data = ws.data as any
          
          if (authenticatedUserId) {
            const hasAccess = await boardService.canAccessBoard(boardId, authenticatedUserId)
            if (!hasAccess) {
              ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }))
              return
            }
          }

          if (data.currentBoardId && data.currentBoardId !== boardId && authenticatedUserId) {
            presenceManager.leave(data.currentBoardId, authenticatedUserId)
          }

          ws.subscribe(`board:${boardId}`)
          data.currentBoardId = boardId

          if (user) {
            presenceManager.join(boardId, {
              id: user.id,
              name: user.name ?? 'Unknown'
            })
          }
        }
        if (userId && authenticatedUserId === userId) {
          ws.subscribe(`user:${userId}`)
        }
      }

      if (type === 'presence:activity' && authenticatedUserId && user) {
        const data = ws.data as any
        if (data.currentBoardId) {
          presenceManager.updateActivity(data.currentBoardId, {
            id: user.id,
            name: user.name ?? 'Unknown'
          })
        }
      }

      if (type === 'sync' && boardId && since) {
        const sinceDate = new Date(since)
        if (!isNaN(sinceDate.getTime())) {
           activityRepository.findByBoardIdSince(boardId, sinceDate)
             .then(activities => {
               ws.send(JSON.stringify({
                 type: 'sync:response',
                 boardId,
                 data: activities
               }))
             })
             .catch(() => {
               ws.send(JSON.stringify({ type: 'error', message: 'Sync failed' }))
             })
        }
      }
    }
  })
  .get('/', () => 'Kyte API')
  .get('/health', () => ({ status: 'ok' }))
  .listen(3000)

wsManager.setServer(app.server!)

logger.info('Kyte API running', { port: 3000, url: 'http://localhost:3000' })

if (process.env.NODE_ENV !== 'test') {
  logger.info('Initializing reminder job', { interval: '15m' })
  setInterval(runReminderJob, 15 * 60 * 1000)
  setTimeout(runReminderJob, 10000)
}

export type App = typeof app

export type {
  Priority,
  Size,
  Reminder,
  BoardRole,
  WorkspaceRole,
  Label,
  TaskAssignee,
  ChecklistProgress,
  Task,
  TaskWithLabels,
  Column,
  Board,
  BoardMember,
  Workspace,
  Comment,
  Activity,
  ChecklistItem,
  Checklist,
  Attachment,
} from './types/domain'
