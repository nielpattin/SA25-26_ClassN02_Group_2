import { t } from 'elysia'

export const CardSchema = {
  id: t.String({ format: 'uuid' }),
  title: t.String({ minLength: 1 }),
  description: t.String(),
  order: t.Number(),
  columnId: t.String({ format: 'uuid' }),
  dueDate: t.Nullable(t.String({ format: 'date-time' })),
}

export const CreateCardBody = t.Object({
  title: CardSchema.title,
  description: t.Optional(CardSchema.description),
  order: CardSchema.order,
  columnId: CardSchema.columnId,
  dueDate: t.Optional(CardSchema.dueDate),
})

export const UpdateCardBody = t.Object({
  title: t.Optional(CardSchema.title),
  description: t.Optional(CardSchema.description),
  order: t.Optional(CardSchema.order),
  columnId: t.Optional(CardSchema.columnId),
  dueDate: t.Optional(CardSchema.dueDate),
})

export const CardParams = t.Object({
  id: CardSchema.id,
})

export const CardColumnParams = t.Object({
  columnId: CardSchema.columnId,
})

export const CardBoardParams = t.Object({
  boardId: t.String({ format: 'uuid' }),
})
