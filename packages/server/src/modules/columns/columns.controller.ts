import { Elysia } from 'elysia'
import { columnService } from './columns.service'
import { CreateColumnBody, UpdateColumnBody, ColumnParams, ColumnBoardParams } from './columns.model'

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
  .delete('/:id', ({ params: { id } }) => columnService.deleteColumn(id), {
    params: ColumnParams,
  })
