import { Elysia, t } from 'elysia'
import { checklistService } from './checklists.service'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'
import { CreateChecklistBody, UpdateChecklistBody, CreateChecklistItemBody, UpdateChecklistItemBody } from './checklists.model'

export const checklistController = new Elysia({ prefix: '/checklists' })
  .use(authPlugin)
  .get('/task/:taskId', async ({ params, session }) => {
    return checklistService.getByTaskId(params.taskId, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ taskId: t.String() })
  })

  .get('/:id', async ({ params, session }) => {
    return checklistService.getById(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .post('/', async ({ body, session }) => {
    return checklistService.create(body, session.user.id)
  }, {
    requireAuth: true,
    body: CreateChecklistBody
  })

  .patch('/:id', async ({ params, body, session }) => {
    return checklistService.update(params.id, body, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() }),
    body: UpdateChecklistBody
  })

  .delete('/:id', async ({ params, session }) => {
    return checklistService.delete(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  // Checklist Items
  .post('/items', async ({ body, session }) => {
    return checklistService.createItem(body, session.user.id)
  }, {
    requireAuth: true,
    body: CreateChecklistItemBody
  })

  .patch('/items/:id', async ({ params, body, session }) => {
    return checklistService.updateItem(params.id, body, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() }),
    body: UpdateChecklistItemBody
  })

  .delete('/items/:id', async ({ params, session }) => {
    return checklistService.deleteItem(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .post('/items/:id/toggle', async ({ params, session }) => {
    return checklistService.toggleItem(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })
