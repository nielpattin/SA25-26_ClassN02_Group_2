import { Elysia, t } from 'elysia'
import { labelService } from './labels.service'
import { auth } from '../auth/auth'
import { CreateLabelBody, UpdateLabelBody } from './labels.model'

export const labelController = new Elysia({ prefix: '/labels' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return { session }
  })
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

  .post('/card/:cardId/label/:labelId', async ({ params, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return labelService.addToTask(params.cardId, params.labelId, session.user.id)
  }, {
    params: t.Object({ cardId: t.String(), labelId: t.String() })
  })

  .delete('/card/:cardId/label/:labelId', async ({ params, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return labelService.removeFromTask(params.cardId, params.labelId, session.user.id)
  }, {
    params: t.Object({ cardId: t.String(), labelId: t.String() })
  })

  .get('/card/:cardId', async ({ params }) => {
    return labelService.getTaskLabels(params.cardId)
  }, {
    params: t.Object({ cardId: t.String() })
  })
