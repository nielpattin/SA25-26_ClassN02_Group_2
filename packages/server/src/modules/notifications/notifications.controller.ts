import { Elysia, t } from 'elysia'
import { notificationService } from './notifications.service'
import { NotificationParams } from './notifications.model'

export const notificationController = new Elysia({ prefix: '/notifications' })
  .get('/', async ({ query }) => {
    // TODO: Get userId from auth context
    const userId = 'temp-user-id'
    const limit = query.limit ? parseInt(query.limit) : 50
    return notificationService.getByUserId(userId, limit)
  }, {
    query: t.Object({ limit: t.Optional(t.String()) }),
  })

  .get('/unread', async () => {
    const userId = 'temp-user-id'
    return notificationService.getUnread(userId)
  })

  .get('/unread/count', async () => {
    const userId = 'temp-user-id'
    return { count: await notificationService.countUnread(userId) }
  })

  .post('/:id/read', async ({ params }) => {
    return notificationService.markAsRead(params.id)
  }, {
    params: NotificationParams,
  })

  .post('/read-all', async () => {
    const userId = 'temp-user-id'
    await notificationService.markAllAsRead(userId)
    return { success: true }
  })

  .delete('/:id', async ({ params }) => {
    return notificationService.delete(params.id)
  }, {
    params: NotificationParams,
  })
