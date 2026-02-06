import { Elysia } from 'elysia'
import { taskDependencyService } from './task-dependencies.service'
import { authPlugin } from '../auth'
import {
  CreateDependencyBody,
  DependencyParams,
  TaskDependencyParams,
  BoardDependencyParams,
} from './task-dependencies.model'

export const taskDependencyController = new Elysia()
  .use(authPlugin)
  .get('/tasks/:id/dependencies', ({ params: { id } }) => taskDependencyService.getByTaskId(id), {
    requireAuth: true,
    params: TaskDependencyParams
  })
  .post('/tasks/:id/dependencies', ({ params: { id }, body, session }) => {
    return taskDependencyService.create({
      blockingTaskId: id,
      blockedTaskId: body.blockedTaskId,
      type: (body.type as any) ?? 'finish_to_start',
    }, session.user.id)
  }, {
    requireAuth: true,
    params: TaskDependencyParams,
    body: CreateDependencyBody
  })
  .delete('/dependencies/:id', ({ params: { id }, session }) => {
    return taskDependencyService.delete(id, session.user.id)
  }, {
    requireAuth: true,
    params: DependencyParams
  })
  .get('/boards/:id/dependencies', ({ params: { id } }) => taskDependencyService.getByBoardId(id), {
    requireAuth: true,
    params: BoardDependencyParams
  })
