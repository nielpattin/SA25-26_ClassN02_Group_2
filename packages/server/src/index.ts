import { Elysia, t } from 'elysia'
import { cors } from '@elysiajs/cors'
import { boardController } from './modules/boards'
import { columnController } from './modules/columns'
import { cardController } from './modules/cards'
import { labelController } from './modules/labels'
import { checklistController } from './modules/checklists'
import { attachmentController } from './modules/attachments'
import { userController } from './modules/users'
import { organizationController } from './modules/organizations'
import { wsManager } from './websocket/manager'

export const app = new Elysia()
  .use(cors())
  .use(boardController)
  .use(columnController)
  .use(cardController)
  .use(labelController)
  .use(checklistController)
  .use(attachmentController)
  .use(userController)
  .use(organizationController)
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
