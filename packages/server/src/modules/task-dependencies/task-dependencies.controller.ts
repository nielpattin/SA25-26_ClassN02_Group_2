import { Elysia } from 'elysia'
import { taskDependencyService } from './task-dependencies.service'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'
import {
  CreateDependencyBody,
  DependencyParams,
  TaskDependencyParams,
  BoardDependencyParams,
} from './task-dependencies.model'

export const taskDependencyController = new Elysia()
  .use(authPlugin)
  .get('/tasks/:id/dependencies', ({ params: { id } }) => taskDependencyService.getByTaskId(id), {
    params: TaskDependencyParams
  })
  .post('/tasks/:id/dependencies', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskDependencyService.create({
      blockingTaskId: id,
      blockedTaskId: body.blockedTaskId,
      type: (body.type as any) ?? 'finish_to_start',
    }, session.user.id)
  }, {
    params: TaskDependencyParams,
    body: CreateDependencyBody
  })
  .delete('/dependencies/:id', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return taskDependencyService.delete(id, session.user.id)
  }, {
    params: DependencyParams
  })
  .get('/boards/:id/dependencies', ({ params: { id } }) => taskDependencyService.getByBoardId(id), {
    params: BoardDependencyParams
  })
