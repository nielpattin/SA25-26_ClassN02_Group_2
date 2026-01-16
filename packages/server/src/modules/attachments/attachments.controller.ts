import { Elysia, t } from 'elysia'
import { attachmentService } from './attachments.service'
import { CreateAttachmentSchema } from './attachments.model'
import { authPlugin } from '../auth'

export const attachmentController = new Elysia({ prefix: '/attachments' })
  .use(authPlugin)
  .get('/task/:taskId', ({ params: { taskId } }) => attachmentService.getByTaskId(taskId), {
    params: t.Object({ taskId: t.String() })
  })
  .post('/', ({ body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return attachmentService.create(body, session.user.id)
  }, {
    body: CreateAttachmentSchema
  })
  .delete('/:id', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return attachmentService.delete(id, session.user.id)
  }, {
    params: t.Object({ id: t.String() })
  })
