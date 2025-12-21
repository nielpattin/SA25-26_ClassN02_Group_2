import { Elysia } from 'elysia'
import { cardService } from './cards.service'
import { CreateCardBody, UpdateCardBody, CardParams, CardColumnParams } from './cards.model'

export const cardController = new Elysia({ prefix: '/cards' })
  .get('/column/:columnId', ({ params: { columnId } }) => cardService.getCardsByColumnId(columnId), {
    params: CardColumnParams,
  })
  .post('/', ({ body }) => cardService.createCard(body), {
    body: CreateCardBody,
  })
  .patch('/:id', ({ params: { id }, body }) => cardService.updateCard(id, body), {
    params: CardParams,
    body: UpdateCardBody,
  })
  .delete('/:id', ({ params: { id } }) => cardService.deleteCard(id), {
    params: CardParams,
  })
