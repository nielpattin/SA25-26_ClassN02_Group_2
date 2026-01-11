import { t } from 'elysia'

export const TaskSchema = {
  id: t.String({ format: 'uuid' }),
  title: t.String({ minLength: 1 }),
  description: t.String(),
  position: t.String(), // Fractional indexing
  columnId: t.String({ format: 'uuid' }),
  dueDate: t.Nullable(t.String({ format: 'date-time' })),
  priority: t.Union([
    t.Literal('urgent'),
    t.Literal('high'),
    t.Literal('medium'),
    t.Literal('low'),
    t.Literal('none'),
  ]),
}

export const CreateTaskBody = t.Object({
  title: TaskSchema.title,
  description: t.Optional(TaskSchema.description),
  position: TaskSchema.position,
  columnId: TaskSchema.columnId,
  dueDate: t.Optional(TaskSchema.dueDate),
  priority: t.Optional(TaskSchema.priority),
  coverImageUrl: t.Optional(t.String()),
})

export const UpdateTaskBody = t.Object({
  title: t.Optional(TaskSchema.title),
  description: t.Optional(TaskSchema.description),
  position: t.Optional(TaskSchema.position),
  columnId: t.Optional(TaskSchema.columnId),
  dueDate: t.Optional(TaskSchema.dueDate),
  priority: t.Optional(t.Nullable(TaskSchema.priority)),
  coverImageUrl: t.Optional(t.Nullable(t.String())),
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
