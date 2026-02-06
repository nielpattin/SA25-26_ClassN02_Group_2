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
  .get('/:id', ({ params: { id }, session }) => {
    return taskService.getTaskById(id, session.user.id)
  }, {
    requireAuth: true,
    params: TaskParams,
  })
  .get('/column/:columnId', ({ params: { columnId }, session }) => {
    return taskService.getTasksByColumnId(columnId)
  }, {
    requireAuth: true,
    params: TaskColumnParams,
  })
  .get('/board/:boardId/enriched', ({ params: { boardId }, session }) => {
    return taskService.getTasksByBoardIdEnriched(boardId)
  }, {
    requireAuth: true,
    params: TaskBoardParams,
  })
  .post('/', ({ body, session }) => {
    const { dueDate, startDate, ...rest } = body
    return taskService.createTask({
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
      startDate: startDate ? new Date(startDate) : null,
    }, session.user.id)
  }, {
    requireAuth: true,
    body: CreateTaskBody,
  })
  .patch('/:id', ({ params: { id }, body, session }) => {
    const { dueDate, startDate, ...rest } = body
    return taskService.updateTask(id, {
      ...rest,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
    }, session.user.id)
  }, {
    requireAuth: true,
    params: TaskParams,
    body: UpdateTaskBody,
  })
  .delete('/:id', ({ params: { id }, session }) => {
    return taskService.deleteTask(id, session.user.id)
  }, {
    requireAuth: true,
    params: TaskParams,
  })
  .delete('/:id/permanent', ({ params: { id }, session }) => {
    return taskService.permanentDeleteTask(id, session.user.id)
  }, {
    requireAuth: true,
    params: TaskParams,
  })
  .patch('/:id/move', async ({ params: { id }, body, session }) => {
    await checkRateLimit(`move:task:${session.user.id}`, 30, 60 * 1000)
    return taskService.moveTask(id, session.user.id, body.columnId, body.position, body.version)
  }, {
    requireAuth: true,
    params: TaskParams,
    body: MoveTaskBody,
  })
  .post('/:id/copy', ({ params: { id }, session }) => {
    return taskService.copyTask(id, session.user.id)
  }, {
    requireAuth: true,
    params: TaskParams,
  })

  // Archive/Restore
  .post('/:id/archive', ({ params: { id }, session }) => {
    return taskService.archiveTask(id, session.user.id)
  }, {
    requireAuth: true,
    params: TaskParams,
  })
  .post('/:id/restore', ({ params: { id }, session }) => {
    return taskService.restoreTask(id, session.user.id)
  }, {
    requireAuth: true,
    params: TaskParams,
  })

  // Assignees
  .get('/:id/assignees', ({ params: { id }, session }) => {
    return taskService.getAssignees(id)
  }, {
    requireAuth: true,
    params: TaskParams,
  })
  .post('/:id/assignees', ({ params: { id }, body, session }) => {
    return taskService.addAssignee(id, body.userId, session.user.id)
  }, {
    requireAuth: true,
    params: TaskParams,
    body: AddAssigneeBody,
  })
  .delete('/:id/assignees/:userId', ({ params: { id, userId }, session }) => {
    return taskService.removeAssignee(id, userId, session.user.id)
  }, {
    requireAuth: true,
    params: TaskAssigneeParams,
  })
