import { t } from 'elysia'

export const CardSchema = {
  id: t.String({ format: 'uuid' }),
  title: t.String({ minLength: 1 }),
  description: t.String(),
  order: t.Number(),
  columnId: t.String({ format: 'uuid' }),
}

export const CreateCardBody = t.Object({
  title: CardSchema.title,
  description: t.Optional(CardSchema.description),
  order: CardSchema.order,
  columnId: CardSchema.columnId,
})

export const UpdateCardBody = t.Object({
  title: t.Optional(CardSchema.title),
  description: t.Optional(CardSchema.description),
  order: t.Optional(CardSchema.order),
  columnId: t.Optional(CardSchema.columnId),
})

export const CardParams = t.Object({
  id: CardSchema.id,
})

export const CardColumnParams = t.Object({
  columnId: CardSchema.columnId,
})
