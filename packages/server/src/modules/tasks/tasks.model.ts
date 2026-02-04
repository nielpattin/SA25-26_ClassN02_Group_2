import { t } from 'elysia'

export const TaskSchema = {
  id: t.String({ format: 'uuid' }),
  title: t.String({ minLength: 1 }),
  description: t.String(),
  position: t.String(), // Fractional indexing
  columnId: t.String({ format: 'uuid' }),
  startDate: t.Nullable(t.String({ format: 'date-time' })),
  dueDate: t.Nullable(t.String({ format: 'date-time' })),
  priority: t.Union([
    t.Literal('urgent'),
    t.Literal('high'),
    t.Literal('medium'),
    t.Literal('low'),
    t.Literal('none'),
  ]),
  reminder: t.Union([
    t.Literal('none'),
    t.Literal('on_day'),
    t.Literal('1_day'),
    t.Literal('2_days'),
    t.Literal('1_week'),
  ]),
  size: t.Union([
    t.Literal('xs'),
    t.Literal('s'),
    t.Literal('m'),
    t.Literal('l'),
    t.Literal('xl'),
  ]),
}

export const CreateTaskBody = t.Object({
  title: TaskSchema.title,
  description: t.Optional(TaskSchema.description),
  position: t.Optional(TaskSchema.position),
  columnId: TaskSchema.columnId,
  startDate: t.Optional(TaskSchema.startDate),
  dueDate: t.Optional(TaskSchema.dueDate),
  priority: t.Optional(TaskSchema.priority),
  reminder: t.Optional(TaskSchema.reminder),
  size: t.Optional(TaskSchema.size),
  coverImageUrl: t.Optional(t.String()),
})

export const UpdateTaskBody = t.Object({
  title: t.Optional(TaskSchema.title),
  description: t.Optional(TaskSchema.description),
  position: t.Optional(TaskSchema.position),
  columnId: t.Optional(TaskSchema.columnId),
  startDate: t.Optional(TaskSchema.startDate),
  dueDate: t.Optional(TaskSchema.dueDate),
  priority: t.Optional(t.Nullable(TaskSchema.priority)),
  reminder: t.Optional(TaskSchema.reminder),
  size: t.Optional(t.Nullable(TaskSchema.size)),
  coverImageUrl: t.Optional(t.Nullable(t.String())),
  version: t.Optional(t.Number()),
})

export const TaskParams = t.Object({
  id: TaskSchema.id,
})

export const TaskColumnParams = t.Object({
  columnId: TaskSchema.columnId,
})

export const TaskBoardParams = t.Object({
  boardId: t.String({ format: 'uuid' }),
})

// Assignee management
export const TaskAssigneeParams = t.Object({
  id: TaskSchema.id,
  userId: t.String(),
})

export const AddAssigneeBody = t.Object({
  userId: t.String(),
})

export const MoveTaskBody = t.Object({
  columnId: t.Optional(TaskSchema.columnId),
  beforeTaskId: t.Optional(t.String({ format: 'uuid' })),
  afterTaskId: t.Optional(t.String({ format: 'uuid' })),
  version: t.Optional(t.Number()),
})
