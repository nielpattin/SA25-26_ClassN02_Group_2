import { Elysia } from 'elysia'
import { columnService } from './columns.service'
import { authPlugin } from '../auth'
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
  .get('/board/:boardId', ({ params: { boardId } }) => columnService.getColumnsByBoardId(boardId), {
    params: ColumnBoardParams,
  })
  .post('/', ({ body, session }) => {
    if (!session) throw new UnauthorizedError()
    return columnService.createColumn(body, session.user.id)
  }, {
    body: CreateColumnBody,
  })
  .patch('/:id', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return columnService.updateColumn(id, body, session.user.id)
  }, {
    params: ColumnParams,
    body: UpdateColumnBody,
  })
  .patch('/:id/move', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return columnService.moveColumn(id, body.beforeColumnId, body.afterColumnId, session.user.id, body.version)
  }, {
    params: ColumnParams,
    body: MoveColumnBody,
  })
  .post('/:id/archive', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return columnService.archiveColumn(id, session.user.id)
  }, {
    params: ColumnParams,
  })
  .post('/:id/copy', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return columnService.copyColumn(id, session.user.id)
  }, {
    params: ColumnParams,
  })
  .patch('/:id/move-to-board', ({ params: { id }, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return columnService.moveColumnToBoard(id, body.targetBoardId, session.user.id)
  }, {
    params: ColumnParams,
    body: MoveToBoardBody,
  })
  .delete('/:id', ({ params: { id }, session }) => {
    if (!session) throw new UnauthorizedError()
    return columnService.deleteColumn(id, session.user.id)
  }, {
    params: ColumnParams,
  })
