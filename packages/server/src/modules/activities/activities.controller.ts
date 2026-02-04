import { Elysia, t } from 'elysia'
import { activityService } from './activities.service'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'
import { BoardActivitiesParams, TaskActivitiesParams, ExportActivitiesQuery } from './activities.model'

export const activityController = new Elysia({ prefix: '/activities' })
  .use(authPlugin)
  .get('/board/:boardId', async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit) : 50
    return activityService.getByBoardId(params.boardId, limit)
  }, {
    params: BoardActivitiesParams,
    query: t.Object({ limit: t.Optional(t.String()) }),
  })

  .get('/task/:taskId', async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit) : 10
    return activityService.getByTaskId(params.taskId, limit, query.cursor)
  }, {
    params: TaskActivitiesParams,
    query: t.Object({
      limit: t.Optional(t.String()),
      cursor: t.Optional(t.String()),
    }),
  })

  // Board activity export endpoint
  .get('/board/:boardId/export', async ({ params: { boardId }, query, session, set }) => {
    if (!session) throw new UnauthorizedError()

    const format = (query.format as 'json' | 'csv') ?? 'json'
    const result = await activityService.exportBoardActivities(
      boardId,
      session.user.id,
      query.dateFrom,
      query.dateTo,
      format
    )

    set.headers['Content-Type'] = result.contentType
    set.headers['Content-Disposition'] = `attachment; filename="${result.filename}"`

    // Return stream directly for efficient large exports
    return result.stream
  }, {
    params: BoardActivitiesParams,
    query: ExportActivitiesQuery,
  })
