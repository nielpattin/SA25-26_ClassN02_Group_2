import { t } from 'elysia'

export const ColumnDefinitionSchema = t.Object({
  name: t.String(),
  position: t.String(),
})

export const LabelDefinitionSchema = t.Object({
  name: t.String(),
  color: t.String(),
})

export const TemplateStatus = {
  NONE: 'none',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const

export const TemplateStatusSchema = t.Union([
  t.Literal('none'),
  t.Literal('pending'),
  t.Literal('approved'),
  t.Literal('rejected'),
])

export const ChecklistItemSchema = t.Object({
  content: t.String(),
})

export const CreateBoardTemplateBody = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  workspaceId: t.Optional(t.String({ format: 'uuid' })),
  columnDefinitions: t.Array(ColumnDefinitionSchema),
  defaultLabels: t.Optional(t.Array(LabelDefinitionSchema)),
  isPublic: t.Optional(t.Boolean()),
  status: t.Optional(TemplateStatusSchema),
  categories: t.Optional(t.Array(t.String())),
  submittedAt: t.Optional(t.Date()),
})

export const UpdateBoardTemplateBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  columnDefinitions: t.Optional(t.Array(ColumnDefinitionSchema)),
  defaultLabels: t.Optional(t.Array(LabelDefinitionSchema)),
  isPublic: t.Optional(t.Boolean()),
  status: t.Optional(TemplateStatusSchema),
  categories: t.Optional(t.Array(t.String())),
  submittedAt: t.Optional(t.Date()),
  approvedAt: t.Optional(t.Date()),
  approvedBy: t.Optional(t.String()),
  takedownRequestedAt: t.Optional(t.Date()),
  takedownAt: t.Optional(t.Date()),
})

export const MarketplaceQuerySchema = t.Object({
  q: t.Optional(t.String()),
  category: t.Optional(t.String()),
  sort: t.Optional(t.Union([
    t.Literal('newest'),
    t.Literal('popular'),
    t.Literal('alphabetical'),
  ])),
  limit: t.Optional(t.Numeric({ default: 20 })),
  offset: t.Optional(t.Numeric({ default: 0 })),
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

export const CloneMarketplaceTemplateBody = t.Object({
  workspaceId: t.String({ format: 'uuid' }),
  boardName: t.Optional(t.String({ minLength: 1 })),
})

export const SubmitTemplateBody = t.Object({
  boardId: t.Optional(t.String({ format: 'uuid' })),
  templateId: t.Optional(t.String({ format: 'uuid' })),
  categories: t.Optional(t.Array(t.String())),
})

export const BoardTemplatesParams = t.Object({
  boardId: t.String({ format: 'uuid' }),
})

export type CreateBoardTemplateInput = typeof CreateBoardTemplateBody.static
export type UpdateBoardTemplateInput = typeof UpdateBoardTemplateBody.static
export type CreateTaskTemplateInput = typeof CreateTaskTemplateBody.static
export type UpdateTaskTemplateInput = typeof UpdateTaskTemplateBody.static
