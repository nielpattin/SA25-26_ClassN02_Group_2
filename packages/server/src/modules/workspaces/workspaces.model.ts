import { t } from 'elysia'

// Enum types matching PostgreSQL enums
export const WorkspaceRoleSchema = t.Union([
  t.Literal('owner'),
  t.Literal('admin'),
  t.Literal('member'),
  t.Literal('viewer')
])

export const WorkspaceSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
  slug: t.String({ minLength: 1 }),
  personal: t.Boolean(),
  createdAt: t.Date()
})

export const CreateWorkspaceBody = t.Object({
  name: t.String({ minLength: 1 }),
  slug: t.String({ minLength: 1 }),
  personal: t.Optional(t.Boolean())
})

export const UpdateWorkspaceBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  slug: t.Optional(t.String({ minLength: 1 })),
  personal: t.Optional(t.Boolean())
})

export const MemberSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  workspaceId: t.String({ format: 'uuid' }),
  userId: t.String(),
  role: WorkspaceRoleSchema,
  createdAt: t.Date()
})

export const AddMemberBody = t.Object({
  userId: t.Optional(t.String()),
  email: t.Optional(t.String({ format: 'email' })),
  role: t.Optional(WorkspaceRoleSchema)
})

export type Workspace = typeof WorkspaceSchema.static
export type CreateWorkspaceInput = typeof CreateWorkspaceBody.static
export type UpdateWorkspaceInput = typeof UpdateWorkspaceBody.static
export type Member = typeof MemberSchema.static
export type AddMemberInput = typeof AddMemberBody.static
