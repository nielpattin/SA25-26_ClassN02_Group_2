import { t } from 'elysia'

export const ThemeSchema = t.Union([t.Literal('light'), t.Literal('dark'), t.Literal('system')])
export const EmailDigestSchema = t.Union([t.Literal('instant'), t.Literal('daily'), t.Literal('weekly'), t.Literal('none')])

export const NotificationPreferenceItemSchema = t.Object({
  inApp: t.Boolean(),
  email: t.Boolean()
})

export const NotificationPreferencesSchema = t.Object({
  mention: NotificationPreferenceItemSchema,
  assignment: NotificationPreferenceItemSchema,
  due_soon: NotificationPreferenceItemSchema,
  due_urgent: NotificationPreferenceItemSchema,
  overdue: NotificationPreferenceItemSchema,
  comment: NotificationPreferenceItemSchema,
  board_invite: NotificationPreferenceItemSchema
})

export const UserSchema = t.Object({
  id: t.String(),
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  emailVerified: t.Boolean(),
  image: t.Optional(t.Nullable(t.String())),
  locale: t.String(),
  timezone: t.String(),
  theme: ThemeSchema,
  emailDigest: EmailDigestSchema,
  notificationPreferences: NotificationPreferencesSchema,
  createdAt: t.Date(),
  updatedAt: t.Date(),
})

export const CreateUserBody = t.Object({
  id: t.Optional(t.String()),
  name: t.String({ minLength: 1 }),
  email: t.String({ format: 'email' }),
  image: t.Optional(t.Nullable(t.String())),
})

export const UpdateUserBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  image: t.Optional(t.Nullable(t.String())),
})

export const UpdateUserPreferencesBody = t.Object({
  locale: t.Optional(t.String({ minLength: 2, maxLength: 10 })),
  timezone: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
  theme: t.Optional(ThemeSchema),
  emailDigest: t.Optional(EmailDigestSchema),
})

export const AvatarUploadBody = t.Object({
  file: t.File({
    type: 'image/*',
    maxSize: 2 * 1024 * 1024 // 2MB
  })
})

export const SessionSchema = t.Object({
  id: t.String(),
  device: t.String(),
  browser: t.String(),
  ipAddress: t.Optional(t.Nullable(t.String())),
  isCurrent: t.Boolean(),
  createdAt: t.Date(),
  expiresAt: t.Date(),
})

export const UpdateNotificationPreferencesBody = t.Partial(
  t.Object({
    mention: t.Partial(NotificationPreferenceItemSchema),
    assignment: t.Partial(NotificationPreferenceItemSchema),
    due_soon: t.Partial(NotificationPreferenceItemSchema),
    due_urgent: t.Partial(NotificationPreferenceItemSchema),
    overdue: t.Partial(NotificationPreferenceItemSchema),
    comment: t.Partial(NotificationPreferenceItemSchema),
    board_invite: t.Partial(NotificationPreferenceItemSchema),
  })
)

export const DeleteAccountBody = t.Object({
  password: t.String()
})

export type User = typeof UserSchema.static
export type CreateUserInput = typeof CreateUserBody.static
export type UpdateUserInput = typeof UpdateUserBody.static
export type UpdateUserPreferencesInput = typeof UpdateUserPreferencesBody.static
export type UpdateNotificationPreferencesInput = typeof UpdateNotificationPreferencesBody.static
export type DeleteAccountInput = typeof DeleteAccountBody.static
export type SessionResponse = typeof SessionSchema.static
