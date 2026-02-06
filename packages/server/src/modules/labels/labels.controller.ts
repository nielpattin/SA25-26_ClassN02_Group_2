import { Elysia, t } from 'elysia'
import { labelService } from './labels.service'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'
import { CreateLabelBody, UpdateLabelBody } from './labels.model'

export const labelController = new Elysia({ prefix: '/labels' })
  .use(authPlugin)
  .get('/board/:boardId', async ({ params, session }) => {
    return labelService.getByBoardId(params.boardId, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ boardId: t.String() })
  })

  .get('/:id', async ({ params }) => {
    return labelService.getById(params.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .post('/', async ({ body }) => {
    return labelService.create(body)
  }, {
    requireAuth: true,
    body: CreateLabelBody
  })

  .patch('/:id', async ({ params, body }) => {
    return labelService.update(params.id, body)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() }),
    body: UpdateLabelBody
  })

  .delete('/:id', async ({ params }) => {
    return labelService.delete(params.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .post('/card/:cardId/label/:labelId', async ({ params, session }) => {
    return labelService.addToTask(params.cardId, params.labelId, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ cardId: t.String(), labelId: t.String() })
  })

  .delete('/card/:cardId/label/:labelId', async ({ params, session }) => {
    return labelService.removeFromTask(params.cardId, params.labelId, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ cardId: t.String(), labelId: t.String() })
  })

  .get('/card/:cardId', async ({ params }) => {
    return labelService.getTaskLabels(params.cardId)
  }, {
    requireAuth: true,
    params: t.Object({ cardId: t.String() })
  })
