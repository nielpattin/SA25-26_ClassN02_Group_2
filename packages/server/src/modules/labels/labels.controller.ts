import { Elysia, t } from 'elysia'
import { labelService } from './labels.service'
import { CreateLabelBody, UpdateLabelBody } from './labels.model'

export const labelController = new Elysia({ prefix: '/labels' })
  .get('/board/:boardId', async ({ params }) => {
    return labelService.getByBoardId(params.boardId)
  }, {
    params: t.Object({ boardId: t.String() })
  })

  .get('/:id', async ({ params }) => {
    return labelService.getById(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .post('/', async ({ body }) => {
    return labelService.create(body)
  }, {
    body: CreateLabelBody
  })

  .patch('/:id', async ({ params, body }) => {
    return labelService.update(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateLabelBody
  })

  .delete('/:id', async ({ params }) => {
    return labelService.delete(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  // Note: API uses 'card' for Kanban convention, but internally uses 'task'
  .post('/card/:cardId/label/:labelId', async ({ params }) => {
    return labelService.addToTask(params.cardId, params.labelId)
  }, {
    params: t.Object({ cardId: t.String(), labelId: t.String() })
  })

  .delete('/card/:cardId/label/:labelId', async ({ params }) => {
    return labelService.removeFromTask(params.cardId, params.labelId)
  }, {
    params: t.Object({ cardId: t.String(), labelId: t.String() })
  })

  .get('/card/:cardId', async ({ params }) => {
    return labelService.getTaskLabels(params.cardId)
  }, {
    params: t.Object({ cardId: t.String() })
  })
