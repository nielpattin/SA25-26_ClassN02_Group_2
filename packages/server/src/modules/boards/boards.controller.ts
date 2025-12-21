import { Elysia } from 'elysia'
import { boardService } from './boards.service'
import { CreateBoardBody, UpdateBoardBody, BoardParams } from './boards.model'

export const boardController = new Elysia({ prefix: '/boards' })
  .get('/', () => boardService.getAllBoards())
  .get('/:id', ({ params: { id } }) => boardService.getBoardById(id), {
    params: BoardParams,
  })
  .post('/', ({ body }) => boardService.createBoard(body), {
    body: CreateBoardBody,
  })
  .patch('/:id', ({ params: { id }, body }) => boardService.updateBoard(id, body), {
    params: BoardParams,
    body: UpdateBoardBody,
  })
  .delete('/:id', ({ params: { id } }) => boardService.deleteBoard(id), {
    params: BoardParams,
  })
