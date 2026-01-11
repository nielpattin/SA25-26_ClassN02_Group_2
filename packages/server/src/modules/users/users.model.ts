import { t } from 'elysia'

export const ThemeSchema = t.Union([t.Literal('light'), t.Literal('dark'), t.Literal('system')])
export const EmailDigestSchema = t.Union([t.Literal('instant'), t.Literal('daily'), t.Literal('weekly'), t.Literal('none')])

export const UserSchema = t.Object({
  id: t.String(),
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  emailVerified: t.Boolean(),
  image: t.Optional(t.String()),
  locale: t.String(),
  timezone: t.String(),
  theme: ThemeSchema,
  emailDigest: EmailDigestSchema,
  createdAt: t.Date(),
  updatedAt: t.Date(),
})

export const CreateUserBody = t.Object({
  id: t.Optional(t.String()),
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  image: t.Optional(t.String()),
})

export const UpdateUserBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  image: t.Optional(t.String()),
})

export const UpdateUserPreferencesBody = t.Object({
  locale: t.Optional(t.String({ minLength: 2, maxLength: 10 })),
  timezone: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  theme: t.Optional(ThemeSchema),
  emailDigest: t.Optional(EmailDigestSchema),
})

export type User = typeof UserSchema.static
export type CreateUserInput = typeof CreateUserBody.static
export type UpdateUserInput = typeof UpdateUserBody.static
export type UpdateUserPreferencesInput = typeof UpdateUserPreferencesBody.static
