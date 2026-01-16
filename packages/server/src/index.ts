import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { authPlugin } from './modules/auth'
import { boardController } from './modules/boards'
import { columnController } from './modules/columns'
import { taskController } from './modules/tasks'
import { labelController } from './modules/labels'
import { checklistController } from './modules/checklists'
import { attachmentController } from './modules/attachments'
import { commentController } from './modules/comments'
import { userController } from './modules/users'
import { organizationController } from './modules/organizations'
import { activityController } from './modules/activities'
import { templateController } from './modules/templates'
import { notificationController } from './modules/notifications'
import { wsManager } from './websocket/manager'

// API v1 - groups all domain controllers under /v1 prefix
const v1 = new Elysia({ prefix: '/v1' })
  .use(boardController)
  .use(columnController)
  .use(taskController)
  .use(labelController)
  .use(checklistController)
  .use(attachmentController)
  .use(commentController)
  .use(userController)
  .use(organizationController)
  .use(activityController)
  .use(templateController)
  .use(notificationController)

export const app = new Elysia()
  .use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))
  .use(authPlugin)
  .use(v1)
  .ws('/ws', {
    body: t.Object({
      type: t.String(),
      boardId: t.String()
    }),
    open(ws) {
      console.log('WS Opened')
    },
    message(ws, { type, boardId }) {
      if (type === 'subscribe') {
        ws.subscribe(`board:${boardId}`)
        console.log(`Subscribed to board:${boardId}`)
      }
    }
  })
  .get('/', () => 'Kyte API')
  .get('/health', () => ({ status: 'ok' }))
  .listen(3000)

wsManager.setServer(app.server!)

console.log('Kyte API running on http://localhost:3000')

export type App = typeof app
