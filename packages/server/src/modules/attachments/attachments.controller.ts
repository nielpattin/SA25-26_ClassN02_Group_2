import { Elysia, t } from 'elysia'
import { attachmentService } from './attachments.service'
import { CreateAttachmentSchema } from './attachments.model'

export const attachmentController = new Elysia({ prefix: '/attachments' })
  .get('/card/:cardId', ({ params: { cardId } }) => attachmentService.getByCardId(cardId))
  .post('/', ({ body }) => attachmentService.create(body), {
    body: CreateAttachmentSchema
  })
  .delete('/:id', ({ params: { id } }) => attachmentService.delete(id))
