import { t } from 'elysia'

export const ChecklistSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  cardId: t.String({ format: 'uuid' }),
  title: t.String({ minLength: 1 }),
  order: t.Number(),
  createdAt: t.Date()
})

export const ChecklistItemSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  checklistId: t.String({ format: 'uuid' }),
  content: t.String({ minLength: 1 }),
  isCompleted: t.Boolean(),
  order: t.Number(),
  createdAt: t.Date()
})

export const CreateChecklistBody = t.Object({
  cardId: t.String({ format: 'uuid' }),
  title: t.String({ minLength: 1 })
})

export const UpdateChecklistBody = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  order: t.Optional(t.Number())
})

export const CreateChecklistItemBody = t.Object({
  checklistId: t.String({ format: 'uuid' }),
  content: t.String({ minLength: 1 })
})

export const UpdateChecklistItemBody = t.Object({
  content: t.Optional(t.String({ minLength: 1 })),
  isCompleted: t.Optional(t.Boolean()),
  order: t.Optional(t.Number())
})

export type Checklist = typeof ChecklistSchema.static
export type ChecklistItem = typeof ChecklistItemSchema.static
export type CreateChecklistInput = typeof CreateChecklistBody.static
export type UpdateChecklistInput = typeof UpdateChecklistBody.static
export type CreateChecklistItemInput = typeof CreateChecklistItemBody.static
export type UpdateChecklistItemInput = typeof UpdateChecklistItemBody.static
