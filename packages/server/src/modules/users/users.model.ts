import { t } from 'elysia'

export const UserSchema = t.Object({
  id: t.String(),
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  image: t.Optional(t.String()),
  createdAt: t.Date()
})

export const CreateUserBody = t.Object({
  id: t.Optional(t.String()),
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  image: t.Optional(t.String())
})

export const UpdateUserBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  image: t.Optional(t.String())
})

export type User = typeof UserSchema.static
export type CreateUserInput = typeof CreateUserBody.static
export type UpdateUserInput = typeof UpdateUserBody.static
