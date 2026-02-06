import { t } from 'elysia'
import { WORKSPACE_LIMITS, WORKSPACE_PATTERNS } from './workspaces.constants'

export const WorkspaceRoleSchema = t.Union([
  t.Literal('owner'),
  t.Literal('admin'),
  t.Literal('member'),
  t.Literal('viewer')
])

export const WorkspaceSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1, maxLength: WORKSPACE_LIMITS.NAME_MAX }),
  description: t.Nullable(t.String()),
  slug: t.String({ minLength: WORKSPACE_LIMITS.SLUG_MIN, maxLength: WORKSPACE_LIMITS.SLUG_MAX }),
  personal: t.Boolean(),
  createdAt: t.Date()
})

export const CreateWorkspaceBody = t.Object({
  name: t.String({ minLength: 1, maxLength: WORKSPACE_LIMITS.NAME_MAX }),
  description: t.Optional(t.String({ maxLength: WORKSPACE_LIMITS.DESCRIPTION_MAX })),
  slug: t.String({ 
    minLength: WORKSPACE_LIMITS.SLUG_MIN, 
    maxLength: WORKSPACE_LIMITS.SLUG_MAX,
    pattern: WORKSPACE_PATTERNS.SLUG_VALIDATION.source 
  }),
  personal: t.Optional(t.Boolean())
})

export const UpdateWorkspaceBody = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: WORKSPACE_LIMITS.NAME_MAX })),
  description: t.Optional(t.Nullable(t.String({ maxLength: WORKSPACE_LIMITS.DESCRIPTION_MAX }))),
  slug: t.Optional(t.String({ 
    minLength: WORKSPACE_LIMITS.SLUG_MIN, 
    maxLength: WORKSPACE_LIMITS.SLUG_MAX,
    pattern: WORKSPACE_PATTERNS.SLUG_VALIDATION.source 
  })),
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
