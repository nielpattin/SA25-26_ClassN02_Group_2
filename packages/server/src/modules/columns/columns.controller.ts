import { Elysia } from 'elysia'
import { columnService } from './columns.service'
import {
  CreateColumnBody,
  UpdateColumnBody,
  MoveColumnBody,
  MoveToBoardBody,
  ColumnParams,
  ColumnBoardParams,
} from './columns.model'

export const columnController = new Elysia({ prefix: '/columns' })
  .get('/board/:boardId', ({ params: { boardId } }) => columnService.getColumnsByBoardId(boardId), {
    params: ColumnBoardParams,
  })
  .post('/', ({ body }) => columnService.createColumn(body), {
    body: CreateColumnBody,
  })
  .patch('/:id', ({ params: { id }, body }) => columnService.updateColumn(id, body), {
    params: ColumnParams,
    body: UpdateColumnBody,
  })
  .patch('/:id/move', ({ params: { id }, body }) =>
    columnService.moveColumn(id, body.beforeColumnId, body.afterColumnId), {
    params: ColumnParams,
    body: MoveColumnBody,
  })
  .post('/:id/archive', ({ params: { id } }) => columnService.archiveColumn(id), {
    params: ColumnParams,
  })
  .post('/:id/copy', ({ params: { id } }) => columnService.copyColumn(id), {
    params: ColumnParams,
  })
  .patch('/:id/move-to-board', ({ params: { id }, body }) =>
    columnService.moveColumnToBoard(id, body.targetBoardId), {
    params: ColumnParams,
    body: MoveToBoardBody,
  })
  .delete('/:id', ({ params: { id } }) => columnService.deleteColumn(id), {
    params: ColumnParams,
  })
