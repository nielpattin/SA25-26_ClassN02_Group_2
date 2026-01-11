import { Elysia, t } from 'elysia'
import { attachmentService } from './attachments.service'
import { CreateAttachmentSchema } from './attachments.model'

export const attachmentController = new Elysia({ prefix: '/attachments' })
  .get('/task/:taskId', ({ params: { taskId } }) => attachmentService.getByTaskId(taskId), {
    params: t.Object({ taskId: t.String() })
  })
  .post('/', ({ body }) => attachmentService.create(body), {
    body: CreateAttachmentSchema
  })
  .delete('/:id', ({ params: { id } }) => attachmentService.delete(id), {
    params: t.Object({ id: t.String() })
  })
