import { Elysia } from 'elysia'
import { columnService } from './columns.service'
import { authPlugin } from '../auth'
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
  .post('/', ({ body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return columnService.createColumn(body, session.user.id)
  }, {
    body: CreateColumnBody,
  })
  .patch('/:id', ({ params: { id }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return columnService.updateColumn(id, body, session.user.id)
  }, {
    params: ColumnParams,
    body: UpdateColumnBody,
  })
  .patch('/:id/move', ({ params: { id }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return columnService.moveColumn(id, body.beforeColumnId, body.afterColumnId, session.user.id)
  }, {
    params: ColumnParams,
    body: MoveColumnBody,
  })
  .post('/:id/archive', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return columnService.archiveColumn(id, session.user.id)
  }, {
    params: ColumnParams,
  })
  .post('/:id/copy', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return columnService.copyColumn(id, session.user.id)
  }, {
    params: ColumnParams,
  })
  .patch('/:id/move-to-board', ({ params: { id }, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return columnService.moveColumnToBoard(id, body.targetBoardId, session.user.id)
  }, {
    params: ColumnParams,
    body: MoveToBoardBody,
  })
  .delete('/:id', ({ params: { id }, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return columnService.deleteColumn(id, session.user.id)
  }, {
    params: ColumnParams,
  })
