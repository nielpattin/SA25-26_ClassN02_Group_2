import { Elysia, t } from 'elysia'
import { attachmentService } from './attachments.service'
import { CreateAttachmentSchema, UploadAttachmentSchema } from './attachments.model'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'

export const attachmentController = new Elysia({ prefix: '/attachments' })
  .use(authPlugin)
  .get('/task/:taskId', ({ params: { taskId } }) => attachmentService.getByTaskId(taskId), {
    params: t.Object({ taskId: t.String() })
  })
  .post('/upload', async ({ body, session }) => {
    if (!session) throw new UnauthorizedError()
    return attachmentService.upload(body.taskId, body.file, session.user.id)
  }, {
    body: UploadAttachmentSchema
  })
  .post('/', ({ body, session }) => {
    if (!session) throw new UnauthorizedError()
    return attachmentService.create(body, session.user.id)
  }, {
    body: CreateAttachmentSchema
  })
  .get('/:id/download', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return attachmentService.getDownloadUrl(id, session.user.id)
  }, {
    params: t.Object({ id: t.String() })
  })
  .delete('/:id', async ({ params: { id }, session, set }) => {
    if (!session) throw new UnauthorizedError()
    await attachmentService.delete(id, session.user.id)
    set.status = 204
  }, {
    params: t.Object({ id: t.String() })
  })
