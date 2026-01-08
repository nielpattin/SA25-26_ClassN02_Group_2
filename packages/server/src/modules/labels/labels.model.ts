import { t } from 'elysia'

export const LabelSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  boardId: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
  color: t.String({ pattern: '^#[0-9A-Fa-f]{6}$' }),
  createdAt: t.Date()
})

export const CreateLabelBody = t.Object({
  boardId: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
  color: t.String({ pattern: '^#[0-9A-Fa-f]{6}$' })
})

export const UpdateLabelBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  color: t.Optional(t.String({ pattern: '^#[0-9A-Fa-f]{6}$' }))
})

export type Label = typeof LabelSchema.static
export type CreateLabelInput = typeof CreateLabelBody.static
export type UpdateLabelInput = typeof UpdateLabelBody.static
