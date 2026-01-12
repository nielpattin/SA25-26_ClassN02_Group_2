import { t } from 'elysia'

export const ColumnSchema = {
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
  position: t.String(), // Fractional indexing
  boardId: t.String({ format: 'uuid' }),
}

export const CreateColumnBody = t.Object({
  name: ColumnSchema.name,
  position: t.Optional(ColumnSchema.position), // Optional - auto-generated if not provided
  boardId: ColumnSchema.boardId,
})

export const UpdateColumnBody = t.Object({
  name: t.Optional(ColumnSchema.name),
  position: t.Optional(ColumnSchema.position),
})

export const MoveColumnBody = t.Object({
  beforeColumnId: t.Optional(t.String({ format: 'uuid' })),
  afterColumnId: t.Optional(t.String({ format: 'uuid' })),
})

export const ColumnParams = t.Object({
  id: ColumnSchema.id,
})

export const ColumnBoardParams = t.Object({
  boardId: ColumnSchema.boardId,
})
