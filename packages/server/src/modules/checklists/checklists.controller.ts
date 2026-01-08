import { Elysia, t } from 'elysia'
import { checklistService } from './checklists.service'
import { CreateChecklistBody, UpdateChecklistBody, CreateChecklistItemBody, UpdateChecklistItemBody } from './checklists.model'

export const checklistController = new Elysia({ prefix: '/checklists' })
  .get('/card/:cardId', async ({ params }) => {
    return checklistService.getByCardId(params.cardId)
  }, {
    params: t.Object({ cardId: t.String() })
  })

  .get('/:id', async ({ params }) => {
    return checklistService.getById(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .post('/', async ({ body }) => {
    return checklistService.create(body)
  }, {
    body: CreateChecklistBody
  })

  .patch('/:id', async ({ params, body }) => {
    return checklistService.update(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateChecklistBody
  })

  .delete('/:id', async ({ params }) => {
    return checklistService.delete(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  // Checklist Items
  .post('/items', async ({ body }) => {
    return checklistService.createItem(body)
  }, {
    body: CreateChecklistItemBody
  })

  .patch('/items/:id', async ({ params, body }) => {
    return checklistService.updateItem(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateChecklistItemBody
  })

  .delete('/items/:id', async ({ params }) => {
    return checklistService.deleteItem(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .post('/items/:id/toggle', async ({ params }) => {
    return checklistService.toggleItem(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })
