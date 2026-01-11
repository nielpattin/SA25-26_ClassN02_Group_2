import { t } from 'elysia'

export const CreateAttachmentSchema = t.Object({
  taskId: t.String(),
  type: t.Union([t.Literal('link'), t.Literal('file')]),
  url: t.String(),
  name: t.String(),
  mimeType: t.Optional(t.String()),
  size: t.Optional(t.Number()),
})

export type CreateAttachmentInput = typeof CreateAttachmentSchema.static
