import { t } from 'elysia'

export const BoardSchema = {
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
}

export const CreateBoardBody = t.Object({
  name: BoardSchema.name,
})

export const UpdateBoardBody = t.Object({
  name: t.Optional(BoardSchema.name),
})

export const BoardParams = t.Object({
  id: BoardSchema.id,
})
