import { t } from 'elysia'

export const ChecklistSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  taskId: t.String({ format: 'uuid' }),
  title: t.String({ minLength: 1 }),
  position: t.String(),
  createdAt: t.Date()
})

export const ChecklistItemSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  checklistId: t.String({ format: 'uuid' }),
  content: t.String({ minLength: 1 }),
  isCompleted: t.Boolean(),
  position: t.String(),
  createdAt: t.Date()
})

export const CreateChecklistBody = t.Object({
  taskId: t.String({ format: 'uuid' }),
  title: t.String({ minLength: 1 })
})

export const UpdateChecklistBody = t.Object({
  title: t.Optional(t.String({ minLength: 1 })),
  position: t.Optional(t.String())
})

export const CreateChecklistItemBody = t.Object({
  checklistId: t.String({ format: 'uuid' }),
  content: t.String({ minLength: 1 })
})

export const UpdateChecklistItemBody = t.Object({
  content: t.Optional(t.String({ minLength: 1 })),
  isCompleted: t.Optional(t.Boolean()),
  position: t.Optional(t.String())
})

export type Checklist = typeof ChecklistSchema.static
export type ChecklistItem = typeof ChecklistItemSchema.static
export type CreateChecklistInput = typeof CreateChecklistBody.static
export type UpdateChecklistInput = typeof UpdateChecklistBody.static
export type CreateChecklistItemInput = typeof CreateChecklistItemBody.static
export type UpdateChecklistItemInput = typeof UpdateChecklistItemBody.static
