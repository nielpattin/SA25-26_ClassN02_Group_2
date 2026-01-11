import { t } from 'elysia'

export const NotificationTypeSchema = t.Union([
  t.Literal('mention'), t.Literal('assignment'), t.Literal('due_soon'),
  t.Literal('due_urgent'), t.Literal('overdue'), t.Literal('comment'), t.Literal('board_invite')
])

export const CreateNotificationInput = t.Object({
  userId: t.String(),
  type: NotificationTypeSchema,
  title: t.String({ minLength: 1 }),
  body: t.Optional(t.String()),
  resourceType: t.Optional(t.String()),
  resourceId: t.Optional(t.String({ format: 'uuid' })),
  boardId: t.Optional(t.String({ format: 'uuid' })),
  taskId: t.Optional(t.String({ format: 'uuid' })),
})

export const NotificationParams = t.Object({
  id: t.String({ format: 'uuid' }),
})

export type CreateNotificationInputType = typeof CreateNotificationInput.static
