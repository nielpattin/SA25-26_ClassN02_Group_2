import { t } from 'elysia'

// Enum types matching PostgreSQL enums
export const OrgRoleSchema = t.Union([
  t.Literal('owner'),
  t.Literal('admin'),
  t.Literal('member'),
  t.Literal('viewer')
])

export const OrganizationSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  name: t.String({ minLength: 1 }),
  slug: t.String({ minLength: 1 }),
  personal: t.Boolean(),
  createdAt: t.Date()
})

export const CreateOrganizationBody = t.Object({
  name: t.String({ minLength: 1 }),
  slug: t.String({ minLength: 1 }),
  personal: t.Optional(t.Boolean())
})

export const UpdateOrganizationBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  slug: t.Optional(t.String({ minLength: 1 })),
  personal: t.Optional(t.Boolean())
})

export const MemberSchema = t.Object({
  id: t.String({ format: 'uuid' }),
  organizationId: t.String({ format: 'uuid' }),
  userId: t.String(),
  role: OrgRoleSchema,
  createdAt: t.Date()
})

export const AddMemberBody = t.Object({
  userId: t.String(),
  role: OrgRoleSchema
})

export type Organization = typeof OrganizationSchema.static
export type CreateOrganizationInput = typeof CreateOrganizationBody.static
export type UpdateOrganizationInput = typeof UpdateOrganizationBody.static
export type Member = typeof MemberSchema.static
export type AddMemberInput = typeof AddMemberBody.static
