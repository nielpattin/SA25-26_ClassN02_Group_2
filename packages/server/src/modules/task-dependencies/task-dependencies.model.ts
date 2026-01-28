import { t } from 'elysia'

export const DependencyType = t.Union([
  t.Literal('finish_to_start'),
  t.Literal('start_to_start'),
  t.Literal('finish_to_finish'),
])

export const CreateDependencyBody = t.Object({
  blockedTaskId: t.String({ format: 'uuid' }),
  type: t.Optional(DependencyType),
})

export const DependencyParams = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const TaskDependencyParams = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const BoardDependencyParams = t.Object({
  id: t.String({ format: 'uuid' }),
})
