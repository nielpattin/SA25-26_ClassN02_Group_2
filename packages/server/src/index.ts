import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authPlugin } from './modules/auth'
import { idempotencyPlugin } from './shared/middleware/idempotency'
import { boardController } from './modules/boards'
import { columnController } from './modules/columns'
import { taskController } from './modules/tasks'
import { labelController } from './modules/labels'
import { checklistController } from './modules/checklists'
import { attachmentController } from './modules/attachments'
import { commentController } from './modules/comments'
import { userController } from './modules/users'
import { workspaceController } from './modules/workspaces'
import { activityController } from './modules/activities'
import { templateController } from './modules/templates'
import { notificationController } from './modules/notifications'
import { searchController } from './modules/search'
import { configController } from './modules/config/config.controller'
import { wsManager } from './websocket/manager'
import { initWebSocketBridge } from './websocket/bridge'
import { initActivitySubscriber } from './modules/activities/activity.subscriber'
import { initNotificationSubscriber } from './modules/notifications/notification.subscriber'
import { runReminderJob } from './jobs/reminder-job'

import { activityRepository } from './modules/activities/activities.repository'
import { AppError } from './shared/errors'

initWebSocketBridge()
initActivitySubscriber()
initNotificationSubscriber()

export const app = new Elysia()
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
    origin: 'http://localhost:5173',
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
    .use(userController)
    .use(workspaceController)
    .use(activityController)
    .use(templateController)
    .use(notificationController)
    .use(searchController)
    .use(configController)
  )
  .ws('/ws', {
    body: t.Object({
      type: t.String(),
      boardId: t.Optional(t.String()),
      userId: t.Optional(t.String()),
      since: t.Optional(t.String())
    }),
    message(ws, { type, boardId, userId, since }) {
      const authenticatedUserId = ws.data.session?.user.id

      if (type === 'subscribe') {
        if (boardId) ws.subscribe(`board:${boardId}`)
        if (userId && authenticatedUserId === userId) {
          ws.subscribe(`user:${userId}`)
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

console.log('Kyte API running on http://localhost:3000')

// Start reminder job
if (process.env.NODE_ENV !== 'test') {
  console.log('Initializing reminder job (15m interval)...')
  setInterval(runReminderJob, 15 * 60 * 1000)
  // Run once on startup after a small delay
  setTimeout(runReminderJob, 10000)
}

export type App = typeof app
