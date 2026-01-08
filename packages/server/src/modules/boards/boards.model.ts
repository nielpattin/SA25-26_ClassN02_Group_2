import { t } from 'elysia'

export const BoardSchema = {
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
}

export const CreateBoardBody = t.Object({
  name: BoardSchema.name,
  organizationId: t.Optional(t.String({ format: 'uuid' })),
  ownerId: t.Optional(t.String()),
})

export const UpdateBoardBody = t.Object({
  name: t.Optional(BoardSchema.name),
})

export const BoardParams = t.Object({
  id: BoardSchema.id,
})
