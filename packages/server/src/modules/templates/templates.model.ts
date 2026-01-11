import { t } from 'elysia'

export const ColumnDefinitionSchema = t.Object({
  name: t.String(),
  position: t.String(),
})

export const LabelDefinitionSchema = t.Object({
  name: t.String(),
  color: t.String(),
})

export const ChecklistItemSchema = t.Object({
  content: t.String(),
})

export const CreateBoardTemplateBody = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  organizationId: t.Optional(t.String({ format: 'uuid' })),
  columnDefinitions: t.Array(ColumnDefinitionSchema),
  defaultLabels: t.Optional(t.Array(LabelDefinitionSchema)),
  isPublic: t.Optional(t.Boolean()),
})

export const UpdateBoardTemplateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  columnDefinitions: t.Optional(t.Array(ColumnDefinitionSchema)),
  defaultLabels: t.Optional(t.Array(LabelDefinitionSchema)),
  isPublic: t.Optional(t.Boolean()),
})

export const CreateTaskTemplateBody = t.Object({
  name: t.String({ minLength: 1 }),
  boardId: t.String({ format: 'uuid' }),
  titlePrefix: t.Optional(t.String()),
  descriptionTemplate: t.Optional(t.String()),
  defaultLabels: t.Optional(t.Array(t.String({ format: 'uuid' }))),
  defaultChecklist: t.Optional(t.Array(ChecklistItemSchema)),
})

export const UpdateTaskTemplateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  titlePrefix: t.Optional(t.String()),
  descriptionTemplate: t.Optional(t.String()),
  defaultLabels: t.Optional(t.Array(t.String({ format: 'uuid' }))),
  defaultChecklist: t.Optional(t.Array(ChecklistItemSchema)),
})

export const TemplateParams = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const BoardTemplatesParams = t.Object({
  boardId: t.String({ format: 'uuid' }),
})

export type CreateBoardTemplateInput = typeof CreateBoardTemplateBody.static
export type UpdateBoardTemplateInput = typeof UpdateBoardTemplateBody.static
export type CreateTaskTemplateInput = typeof CreateTaskTemplateBody.static
export type UpdateTaskTemplateInput = typeof UpdateTaskTemplateBody.static
