import { Elysia, t } from 'elysia'
import { notificationService } from './notifications.service'
import { authPlugin } from '../auth'
import { NotificationParams } from './notifications.model'

export const notificationController = new Elysia({ prefix: '/notifications' })
  .use(authPlugin)
  .get('/', async ({ query, session }) => {
    const limit = query.limit ? parseInt(query.limit) : 50
    return notificationService.getByUserId(session.user.id, limit)
  }, {
    requireAuth: true,
    query: t.Object({ limit: t.Optional(t.String()) }),
  })

  .get('/unread', async ({ session }) => {
    return notificationService.getUnread(session.user.id)
  }, { requireAuth: true })

  .get('/unread/count', async ({ session }) => {
    return { count: await notificationService.countUnread(session.user.id) }
  }, { requireAuth: true })

  .post('/:id/read', async ({ params, session }) => {
    return notificationService.markAsRead(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: NotificationParams,
  })

  .post('/read-all', async ({ session }) => {
    await notificationService.markAllAsRead(session.user.id)
    return { success: true }
  }, { requireAuth: true })

  .delete('/:id', async ({ params, session }) => {
    return notificationService.delete(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: NotificationParams,
  })
