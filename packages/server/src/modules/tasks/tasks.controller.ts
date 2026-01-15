import { Elysia, t } from 'elysia'
import { taskService } from './tasks.service'
import { auth } from '../auth/auth'
import {
  CreateTaskBody,
  UpdateTaskBody,
  TaskParams,
  TaskColumnParams,
  TaskBoardParams,
  TaskAssigneeParams,
  AddAssigneeBody,
  MoveTaskBody,
} from './tasks.model'

export const taskController = new Elysia({ prefix: '/tasks' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return { session }
  })
  // Task CRUD
  .get('/:id', ({ params: { id } }) => taskService.getTaskById(id), {
    params: TaskParams,
  })
  .get('/column/:columnId', ({ params: { columnId } }) => taskService.getTasksByColumnId(columnId), {
    params: TaskColumnParams,
  })
  .get('/board/:boardId/enriched', ({ params: { boardId } }) => taskService.getTasksByBoardIdEnriched(boardId), {
    params: TaskBoardParams,
  })
  .post('/', ({ body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const { dueDate, ...rest } = body
    return taskService.createTask({
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
    }, session.user.id)
  }, {
    body: CreateTaskBody,
  })
  .patch('/:id', ({ params: { id }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const { dueDate, ...rest } = body
    return taskService.updateTask(id, {
      ...rest,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
    }, session.user.id)
  }, {
    params: TaskParams,
    body: UpdateTaskBody,
  })
  .delete('/:id', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return taskService.deleteTask(id, session.user.id)
  }, {
    params: TaskParams,
  })
  .patch('/:id/move', ({ params: { id }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return taskService.moveTask(id, session.user.id, body.columnId, body.beforeTaskId, body.afterTaskId)
  }, {
    params: TaskParams,
    body: MoveTaskBody,
  })
  .post('/:id/copy', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return taskService.copyTask(id, session.user.id)
  }, {
    params: TaskParams,
  })

  // Archive/Restore
  .post('/:id/archive', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return taskService.archiveTask(id, session.user.id)
  }, {
    params: TaskParams,
  })
  .post('/:id/restore', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return taskService.restoreTask(id, session.user.id)
  }, {
    params: TaskParams,
  })

  // Assignees
  .get('/:id/assignees', ({ params: { id } }) => taskService.getAssignees(id), {
    params: TaskParams,
  })
  .post('/:id/assignees', ({ params: { id }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return taskService.addAssignee(id, body.userId, session.user.id)
  }, {
    params: TaskParams,
    body: AddAssigneeBody,
  })
  .delete('/:id/assignees/:userId', ({ params: { id, userId }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return taskService.removeAssignee(id, userId, session.user.id)
  }, {
    params: TaskAssigneeParams,
  })
