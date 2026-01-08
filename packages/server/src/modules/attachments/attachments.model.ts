import { t } from 'elysia'

export const CreateAttachmentSchema = t.Object({
  cardId: t.String(),
  type: t.String(), // 'link' or 'file'
  url: t.String(),
  name: t.String(),
  mimeType: t.Optional(t.String()),
  size: t.Optional(t.Number()),
})

export type CreateAttachmentInput = typeof CreateAttachmentSchema.static
