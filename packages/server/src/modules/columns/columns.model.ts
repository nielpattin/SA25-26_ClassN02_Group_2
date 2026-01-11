import { t } from 'elysia'

export const ColumnSchema = {
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
  position: t.String(), // Fractional indexing
  boardId: t.String({ format: 'uuid' }),
}

export const CreateColumnBody = t.Object({
  name: ColumnSchema.name,
  position: ColumnSchema.position,
  boardId: ColumnSchema.boardId,
})

export const UpdateColumnBody = t.Object({
  name: t.Optional(ColumnSchema.name),
  position: t.Optional(ColumnSchema.position),
})

export const ColumnParams = t.Object({
  id: ColumnSchema.id,
})

export const ColumnBoardParams = t.Object({
  boardId: ColumnSchema.boardId,
})
