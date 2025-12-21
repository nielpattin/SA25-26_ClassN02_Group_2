import { t } from 'elysia'

export const ColumnSchema = {
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
  order: t.Number(),
  boardId: t.String({ format: 'uuid' }),
}

export const CreateColumnBody = t.Object({
  name: ColumnSchema.name,
  order: ColumnSchema.order,
  boardId: ColumnSchema.boardId,
})

export const UpdateColumnBody = t.Object({
  name: t.Optional(ColumnSchema.name),
  order: t.Optional(ColumnSchema.order),
})

export const ColumnParams = t.Object({
  id: ColumnSchema.id,
})

export const ColumnBoardParams = t.Object({
  boardId: ColumnSchema.boardId,
})
