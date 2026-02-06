import { Elysia, t } from 'elysia'
import { attachmentService } from './attachments.service'
import { CreateAttachmentSchema, UploadAttachmentSchema } from './attachments.model'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'

export const attachmentController = new Elysia({ prefix: '/attachments' })
  .use(authPlugin)
  .get('/task/:taskId', ({ params: { taskId }, session }) => {
    return attachmentService.getByTaskId(taskId, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ taskId: t.String() })
  })
  .post('/upload', async ({ body, session }) => {
    return attachmentService.upload(body.taskId, body.file, session.user.id)
  }, {
    requireAuth: true,
    body: UploadAttachmentSchema
  })
  .post('/', ({ body, session }) => {
    return attachmentService.create(body, session.user.id)
  }, {
    requireAuth: true,
    body: CreateAttachmentSchema
  })
  .get('/:id/download', ({ params: { id }, session }) => {
    return attachmentService.getDownloadUrl(id, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })
  .delete('/:id', async ({ params: { id }, session, set }) => {
    await attachmentService.delete(id, session.user.id)
    set.status = 204
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })
