import { Elysia, t } from 'elysia'
import { workspaceService } from './workspaces.service'
import { CreateWorkspaceBody, UpdateWorkspaceBody, AddMemberBody } from './workspaces.model'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'

export const workspaceController = new Elysia({ prefix: '/workspaces' })
  .use(authPlugin)
  .get('/', async () => {
    return workspaceService.getAll()
  })

  .get('/:id', async ({ params }) => {
    return workspaceService.getById(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .get('/slug/:slug', async ({ params }) => {
    return workspaceService.getBySlug(params.slug)
  }, {
    params: t.Object({ slug: t.String() })
  })

  .post('/', async ({ body, session }) => {
    if (!session) throw new UnauthorizedError()
    return workspaceService.create(body, session.user.id)
  }, {
    body: CreateWorkspaceBody
  })

  .patch('/:id', async ({ params, body }) => {
    return workspaceService.update(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateWorkspaceBody
  })

  .delete('/:id', async ({ params }) => {
    return workspaceService.delete(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .get('/:id/members', async ({ params }) => {
    return workspaceService.getMembers(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .post('/:id/members', async ({ params, body, session }) => {
    if (!session) throw new UnauthorizedError()
    return workspaceService.addMember(params.id, body, session.user.id)
  }, {
    params: t.Object({ id: t.String() }),
    body: AddMemberBody
  })

  .delete('/:id/members/:userId', async ({ params, session }) => {
    if (!session) throw new UnauthorizedError()
    return workspaceService.removeMember(params.id, params.userId, session.user.id)
  }, {
    params: t.Object({ id: t.String(), userId: t.String() })
  })

  .get('/:id/boards', async ({ params }) => {
    return workspaceService.getBoards(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .get('/user/:userId', async ({ params }) => {
    return workspaceService.getUserWorkspaces(params.userId)
  }, {
    params: t.Object({ userId: t.String() })
  })
