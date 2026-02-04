import { Elysia, t } from 'elysia'
import { taskService } from './tasks.service'
import { authPlugin } from '../auth'
import { checkRateLimit } from '../../shared/middleware/rate-limit'
import { UnauthorizedError } from '../../shared/errors'
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
  .use(authPlugin)
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
  .post('/', ({ body, session }) => {
    if (!session) throw new UnauthorizedError()
    const { dueDate, startDate, ...rest } = body
    return taskService.createTask({
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
    }, session.user.id)
  }, {
    body: CreateTaskBody,
  })
  .patch('/:id', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    const { dueDate, startDate, ...rest } = body
    return taskService.updateTask(id, {
      ...rest,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
    }, session.user.id)
  }, {
    params: TaskParams,
    body: UpdateTaskBody,
  })
  .delete('/:id', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskService.deleteTask(id, session.user.id)
  }, {
    params: TaskParams,
  })
  .delete('/:id/permanent', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskService.permanentDeleteTask(id, session.user.id)
  }, {
    params: TaskParams,
  })
  .patch('/:id/move', async ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    await checkRateLimit(`move:task:${session.user.id}`, 30, 60 * 1000)
    return taskService.moveTask(id, session.user.id, body.columnId, body.position, body.version)
  }, {
    params: TaskParams,
    body: MoveTaskBody,
  })
  .post('/:id/copy', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskService.copyTask(id, session.user.id)
  }, {
    params: TaskParams,
  })

  // Archive/Restore
  .post('/:id/archive', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskService.archiveTask(id, session.user.id)
  }, {
    params: TaskParams,
  })
  .post('/:id/restore', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskService.restoreTask(id, session.user.id)
  }, {
    params: TaskParams,
  })

  // Assignees
  .get('/:id/assignees', ({ params: { id } }) => taskService.getAssignees(id), {
    params: TaskParams,
  })
  .post('/:id/assignees', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskService.addAssignee(id, body.userId, session.user.id)
  }, {
    params: TaskParams,
    body: AddAssigneeBody,
  })
  .delete('/:id/assignees/:userId', ({ params: { id, userId }, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskService.removeAssignee(id, userId, session.user.id)
  }, {
    params: TaskAssigneeParams,
  })
