import { Elysia, t } from 'elysia'
import { activityService } from './activities.service'
import { BoardActivitiesParams, TaskActivitiesParams } from './activities.model'

export const activityController = new Elysia({ prefix: '/activities' })
  .get('/board/:boardId', async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit) : 50
    return activityService.getByBoardId(params.boardId, limit)
  }, {
    params: BoardActivitiesParams,
    query: t.Object({ limit: t.Optional(t.String()) }),
  })

  .get('/task/:taskId', async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit) : 50
    return activityService.getByTaskId(params.taskId, limit)
  }, {
    params: TaskActivitiesParams,
    query: t.Object({ limit: t.Optional(t.String()) }),
  })
