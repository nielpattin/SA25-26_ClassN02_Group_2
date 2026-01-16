import { Elysia, t } from 'elysia'
import { attachmentService } from './attachments.service'
import { CreateAttachmentSchema } from './attachments.model'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'

export const attachmentController = new Elysia({ prefix: '/attachments' })
  .use(authPlugin)
  .get('/task/:taskId', ({ params: { taskId } }) => attachmentService.getByTaskId(taskId), {
    params: t.Object({ taskId: t.String() })
  })
  .post('/', ({ body, session }) => {
    if (!session) throw new UnauthorizedError()
    return attachmentService.create(body, session.user.id)
  }, {
    body: CreateAttachmentSchema
  })
  .delete('/:id', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return attachmentService.delete(id, session.user.id)
  }, {
    params: t.Object({ id: t.String() })
  })
