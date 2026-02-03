import { t } from 'elysia'

export const BoardPreferenceSchema = {
  view: t.Union([t.Literal('kanban'), t.Literal('calendar'), t.Literal('gantt')]),
  zoomMode: t.Union([t.Literal('day'), t.Literal('week'), t.Literal('month'), t.Literal('quarter')]),
  filters: t.Object({
    labelIds: t.Array(t.String({ format: 'uuid' })),
    assigneeIds: t.Array(t.String()),
    dueDate: t.Nullable(t.Union([
      t.Literal('overdue'),
      t.Literal('due-today'),
      t.Literal('due-this-week'),
      t.Literal('due-this-month'),
      t.Literal('no-due-date')
    ])),
    status: t.Union([t.Literal('active'), t.Literal('completed'), t.Literal('all')]),
  }),
}

export const UpdateBoardPreferenceBody = t.Partial(t.Object({
  view: BoardPreferenceSchema.view,
  zoomMode: BoardPreferenceSchema.zoomMode,
  filters: BoardPreferenceSchema.filters,
}))
