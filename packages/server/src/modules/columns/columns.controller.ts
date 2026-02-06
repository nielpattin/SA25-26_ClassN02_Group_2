import { Elysia } from 'elysia'
import { columnService } from './columns.service'
import { authPlugin } from '../auth'
import { checkRateLimit } from '../../shared/middleware/rate-limit'
import { UnauthorizedError } from '../../shared/errors'
import {
  CreateColumnBody,
  UpdateColumnBody,
  MoveColumnBody,
  MoveToBoardBody,
  ColumnParams,
  ColumnBoardParams,
} from './columns.model'

export const columnController = new Elysia({ prefix: '/columns' })
  .use(authPlugin)
  .get('/board/:boardId', ({ params: { boardId }, session }) => {
    return columnService.getColumnsByBoardId(boardId, session.user.id)
  }, {
    requireAuth: true,
    params: ColumnBoardParams,
  })
  .post('/', ({ body, session }) => {
    return columnService.createColumn(body, session.user.id)
  }, {
    body: CreateColumnBody,
    requireAuth: true,
  })
  .patch('/:id', ({ params: { id }, body, session }) => {
    return columnService.updateColumn(id, body, session.user.id)
  }, {
    params: ColumnParams,
    body: UpdateColumnBody,
    requireAuth: true,
  })
  .patch('/:id/move', async ({ params: { id }, body, session }) => {
    await checkRateLimit(`move:column:${session.user.id}`, 20, 60 * 1000)
    return columnService.moveColumn(id, body.position, session.user.id, body.version)
  }, {
    params: ColumnParams,
    body: MoveColumnBody,
    requireAuth: true,
  })
  .post('/:id/archive', ({ params: { id }, session }) => {
    return columnService.archiveColumn(id, session.user.id)
  }, {
    params: ColumnParams,
    requireAuth: true,
  })
  .post('/:id/restore', ({ params: { id }, session }) => {
    return columnService.restoreColumn(id, session.user.id)
  }, {
    params: ColumnParams,
    requireAuth: true,
  })
  .post('/:id/copy', ({ params: { id }, session }) => {
    return columnService.copyColumn(id, session.user.id)
  }, {
    params: ColumnParams,
    requireAuth: true,
  })
  .patch('/:id/move-to-board', ({ params: { id }, body, session }) => {
    return columnService.moveColumnToBoard(id, body.targetBoardId, session.user.id)
  }, {
    params: ColumnParams,
    body: MoveToBoardBody,
    requireAuth: true,
  })
  .delete('/:id', ({ params: { id }, session }) => {
    return columnService.deleteColumn(id, session.user.id)
  }, {
    params: ColumnParams,
    requireAuth: true,
  })
  .delete('/:id/permanent', ({ params: { id }, session }) => {
    return columnService.permanentDeleteColumn(id, session.user.id)
  }, {
    params: ColumnParams,
    requireAuth: true,
  })
