import { Elysia, t } from 'elysia'
import { checklistService } from './checklists.service'
import { auth } from '../auth/auth'
import { CreateChecklistBody, UpdateChecklistBody, CreateChecklistItemBody, UpdateChecklistItemBody } from './checklists.model'

export const checklistController = new Elysia({ prefix: '/checklists' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return { session }
  })
  .get('/task/:taskId', async ({ params }) => {
    return checklistService.getByTaskId(params.taskId)
  }, {
    params: t.Object({ taskId: t.String() })
  })

  .get('/:id', async ({ params }) => {
    return checklistService.getById(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .post('/', async ({ body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return checklistService.create(body, session.user.id)
  }, {
    body: CreateChecklistBody
  })

  .patch('/:id', async ({ params, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return checklistService.update(params.id, body, session.user.id)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateChecklistBody
  })

  .delete('/:id', async ({ params, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return checklistService.delete(params.id, session.user.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  // Checklist Items
  .post('/items', async ({ body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return checklistService.createItem(body, session.user.id)
  }, {
    body: CreateChecklistItemBody
  })

  .patch('/items/:id', async ({ params, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return checklistService.updateItem(params.id, body, session.user.id)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateChecklistItemBody
  })

  .delete('/items/:id', async ({ params, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return checklistService.deleteItem(params.id, session.user.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .post('/items/:id/toggle', async ({ params, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return checklistService.toggleItem(params.id, session.user.id)
  }, {
    params: t.Object({ id: t.String() })
  })
