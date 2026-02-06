import { Elysia } from 'elysia'
import { authPlugin } from '../auth'
import { searchService } from './search.service'
import { SearchQuery } from './search.model'
import { UnauthorizedError } from '../../shared/errors'

export const searchController = new Elysia({ prefix: '/search' })
  .use(authPlugin)
  .get('/', async ({ session, query }) => {
    const { q, scope, boardId, page, limit } = query

    return searchService.search(session.user.id, q, {
      scope: scope as 'all' | 'boards' | 'tasks' | undefined,
      boardId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    })
  }, {
    requireAuth: true,
    query: SearchQuery,
  })
