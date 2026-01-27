import { t } from 'elysia'

export const BoardSchema = {
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
  visibility: t.Union([t.Literal('private'), t.Literal('workspace'), t.Literal('public')]),
  role: t.Union([t.Literal('admin'), t.Literal('member'), t.Literal('viewer')]),
}

export const CreateBoardBody = t.Object({
  name: BoardSchema.name,
  description: t.Optional(t.String()),
  workspaceId: t.Optional(t.String({ format: 'uuid' })),
  ownerId: t.Optional(t.String()),
  visibility: t.Optional(BoardSchema.visibility),
})

export const UpdateBoardBody = t.Object({
  name: t.Optional(BoardSchema.name),
  description: t.Optional(t.String()),
  visibility: t.Optional(BoardSchema.visibility),
  position: t.Optional(t.String()),
  version: t.Optional(t.Number()),
})

export const BoardParams = t.Object({
  id: BoardSchema.id,
})

// Member management
export const BoardMemberParams = t.Object({
  id: BoardSchema.id,
  userId: t.String(),
})

export const AddMemberBody = t.Object({
  userId: t.String(),
  role: t.Optional(BoardSchema.role),
})

export const UpdateMemberRoleBody = t.Object({
  role: BoardSchema.role,
})

// Starring
export const StarBoardParams = t.Object({
  id: BoardSchema.id,
})

export const ExportBoardQuery = t.Object({
  format: t.Optional(t.Union([t.Literal('json'), t.Literal('csv')])),
  includeArchived: t.Optional(t.Union([t.Literal('true'), t.Literal('false')])),
})
