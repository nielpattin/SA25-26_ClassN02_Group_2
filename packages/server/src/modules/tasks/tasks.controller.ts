import { Elysia } from 'elysia'
import { taskService } from './tasks.service'
import {
  CreateTaskBody,
  UpdateTaskBody,
  TaskParams,
  TaskColumnParams,
  TaskBoardParams,
  TaskAssigneeParams,
  AddAssigneeBody,
} from './tasks.model'

export const taskController = new Elysia({ prefix: '/tasks' })
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
  .post('/', ({ body }) => {
    const { dueDate, ...rest } = body
    return taskService.createTask({
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
  }, {
    body: CreateTaskBody,
  })
  .patch('/:id', ({ params: { id }, body }) => {
    const { dueDate, ...rest } = body
    return taskService.updateTask(id, {
      ...rest,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
    })
  }, {
    params: TaskParams,
    body: UpdateTaskBody,
  })
  .delete('/:id', ({ params: { id } }) => taskService.deleteTask(id), {
    params: TaskParams,
  })

  // Archive/Restore
  .post('/:id/archive', ({ params: { id } }) => taskService.archiveTask(id), {
    params: TaskParams,
  })
  .post('/:id/restore', ({ params: { id } }) => taskService.restoreTask(id), {
    params: TaskParams,
  })

  // Assignees
  .get('/:id/assignees', ({ params: { id } }) => taskService.getAssignees(id), {
    params: TaskParams,
  })
  .post('/:id/assignees', ({ params: { id }, body }) => {
    // TODO: Get assignedBy from auth context
    return taskService.addAssignee(id, body.userId)
  }, {
    params: TaskParams,
    body: AddAssigneeBody,
  })
  .delete('/:id/assignees/:userId', ({ params: { id, userId } }) =>
    taskService.removeAssignee(id, userId), {
    params: TaskAssigneeParams,
  })
