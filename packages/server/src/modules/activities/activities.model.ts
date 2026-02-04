import { t } from 'elysia'

export const ActivityActionSchema = t.Union([
  t.Literal('created'), t.Literal('updated'), t.Literal('deleted'), t.Literal('moved'),
  t.Literal('moved_out'),
  t.Literal('assigned'), t.Literal('unassigned'), t.Literal('completed'), t.Literal('uncompleted'),
  t.Literal('archived'), t.Literal('restored'), t.Literal('label_added'), t.Literal('label_removed'),
  t.Literal('due_date_set'), t.Literal('attachment_added')
])

export const ActivityTargetSchema = t.Union([
  t.Literal('task'), t.Literal('column'), t.Literal('board'), t.Literal('comment'),
  t.Literal('checklist'), t.Literal('checklist_item'), t.Literal('attachment'), t.Literal('label'),
  t.Literal('user')
])

export const CreateActivityInput = t.Object({
  boardId: t.String({ format: 'uuid' }),
  taskId: t.Optional(t.String({ format: 'uuid' })),
  userId: t.String(),
  action: ActivityActionSchema,
  targetType: ActivityTargetSchema,
  targetId: t.String({ format: 'uuid' }),
  changes: t.Optional(t.Any()),
})

export const BoardActivitiesParams = t.Object({
  boardId: t.String({ format: 'uuid' }),
})

export const TaskActivitiesParams = t.Object({
  taskId: t.String({ format: 'uuid' }),
})

export const ExportActivitiesQuery = t.Object({
  dateFrom: t.String({ format: 'date' }),
  dateTo: t.String({ format: 'date' }),
  format: t.Optional(t.Union([t.Literal('json'), t.Literal('csv')])),
})

export type CreateActivityInputType = typeof CreateActivityInput.static

export interface ActivityExportRow {
  id: string
  boardId: string
  taskId: string | null
  userId: string
  userName: string | null
  action: string
  targetType: string
  targetId: string
  changes: unknown
  createdAt: string
}
