import { Elysia, t } from 'elysia'
import { notificationService } from './notifications.service'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'
import { NotificationParams } from './notifications.model'

export const notificationController = new Elysia({ prefix: '/notifications' })
  .use(authPlugin)
  .get('/', async ({ query, session }) => {
    if (!session) throw new UnauthorizedError()
    const limit = query.limit ? parseInt(query.limit) : 50
    return notificationService.getByUserId(session.user.id, limit)
  }, {
    query: t.Object({ limit: t.Optional(t.String()) }),
  })

  .get('/unread', async ({ session }) => {
    if (!session) throw new UnauthorizedError()
    return notificationService.getUnread(session.user.id)
  })

  .get('/unread/count', async ({ session }) => {
    if (!session) throw new UnauthorizedError()
    return { count: await notificationService.countUnread(session.user.id) }
  })

  .post('/:id/read', async ({ params }) => {
    return notificationService.markAsRead(params.id)
  }, {
    params: NotificationParams,
  })

  .post('/read-all', async ({ session }) => {
    if (!session) throw new UnauthorizedError()
    await notificationService.markAllAsRead(session.user.id)
    return { success: true }
  })

  .delete('/:id', async ({ params }) => {
    return notificationService.delete(params.id)
  }, {
    params: NotificationParams,
  })
