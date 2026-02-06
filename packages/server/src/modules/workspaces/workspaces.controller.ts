import { Elysia, t } from 'elysia'
import { workspaceService } from './workspaces.service'
import { CreateWorkspaceBody, UpdateWorkspaceBody, AddMemberBody } from './workspaces.model'
import { authPlugin } from '../auth'

export const workspaceController = new Elysia({ prefix: '/workspaces' })
  .use(authPlugin)
  .get('/', async () => {
    return workspaceService.getAll()
  }, { requireAuth: true })

  .get('/:id', async ({ params, session }) => {
    return workspaceService.getById(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .get('/slug/:slug', async ({ params }) => {
    return workspaceService.getBySlug(params.slug)
  }, {
    requireAuth: true,
    params: t.Object({ slug: t.String() })
  })

  .post('/', async ({ body, session }) => {
    return workspaceService.create(body, session.user.id)
  }, {
    requireAuth: true,
    body: CreateWorkspaceBody
  })

  .patch('/:id', async ({ params, body }) => {
    return workspaceService.update(params.id, body)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() }),
    body: UpdateWorkspaceBody
  })

  .delete('/:id', async ({ params }) => {
    return workspaceService.delete(params.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .get('/:id/members', async ({ params }) => {
    return workspaceService.getMembers(params.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .post('/:id/members', async ({ params, body, session }) => {
    return workspaceService.addMember(params.id, body, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() }),
    body: AddMemberBody
  })

  .delete('/:id/members/:userId', async ({ params, session }) => {
    return workspaceService.removeMember(params.id, params.userId, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String(), userId: t.String() })
  })

  .get('/:id/boards', async ({ params }) => {
    return workspaceService.getBoards(params.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .get('/:id/archived-boards', async ({ params, session }) => {
    return workspaceService.getArchivedBoards(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: t.Object({ id: t.String() })
  })

  .get('/user/:userId', ({ params }) => {
    return workspaceService.getUserWorkspaces(params.userId)
  }, {
    requireAuth: true,
    params: t.Object({ userId: t.String() })
  })
