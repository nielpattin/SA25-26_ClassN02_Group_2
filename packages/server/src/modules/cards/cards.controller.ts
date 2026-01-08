import { Elysia } from 'elysia'
import { cardService } from './cards.service'
import { CreateCardBody, UpdateCardBody, CardParams, CardColumnParams, CardBoardParams } from './cards.model'

export const cardController = new Elysia({ prefix: '/cards' })
  .get('/:id', ({ params: { id } }) => cardService.getCardById(id), {
    params: CardParams,
  })
  .get('/column/:columnId', ({ params: { columnId } }) => cardService.getCardsByColumnId(columnId), {
    params: CardColumnParams,
  })
  .get('/board/:boardId/enriched', ({ params: { boardId } }) => cardService.getCardsByBoardIdEnriched(boardId), {
    params: CardBoardParams,
  })
  .post('/', ({ body }) => {
    const { dueDate, ...rest } = body
    return cardService.createCard({
      ...rest,
      dueDate: dueDate ? new Date(dueDate) : null,
    })
  }, {
    body: CreateCardBody,
  })
  .patch('/:id', ({ params: { id }, body }) => {
    const { dueDate, ...rest } = body
    return cardService.updateCard(id, {
      ...rest,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
    })
  }, {
    params: CardParams,
    body: UpdateCardBody,
  })
  .delete('/:id', ({ params: { id } }) => cardService.deleteCard(id), {
    params: CardParams,
  })
