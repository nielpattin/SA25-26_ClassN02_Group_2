import { t } from 'elysia'

export const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/json',
  'application/zip',
  'application/x-rar-compressed',
  'application/gzip',
  'application/x-7z-compressed',
])

export const CreateAttachmentSchema = t.Object({
  taskId: t.String(),
  type: t.Union([t.Literal('link'), t.Literal('file')]),
  url: t.String(),
  name: t.String(),
  mimeType: t.Optional(t.String()),
  size: t.Optional(t.Number()),
  uploadedBy: t.Optional(t.String()),
})

export type CreateAttachmentInput = typeof CreateAttachmentSchema.static

export const UploadAttachmentSchema = t.Object({
  taskId: t.String(),
  file: t.File({ maxSize: '10m' }),
})

export type UploadAttachmentInput = typeof UploadAttachmentSchema.static
