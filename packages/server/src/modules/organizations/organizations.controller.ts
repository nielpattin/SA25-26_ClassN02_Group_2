import { Elysia, t } from 'elysia'
import { organizationService } from './organizations.service'
import { CreateOrganizationBody, UpdateOrganizationBody, AddMemberBody } from './organizations.model'

export const organizationController = new Elysia({ prefix: '/organizations' })
  .get('/', async () => {
    return organizationService.getAll()
  })

  .get('/:id', async ({ params }) => {
    return organizationService.getById(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .get('/slug/:slug', async ({ params }) => {
    return organizationService.getBySlug(params.slug)
  }, {
    params: t.Object({ slug: t.String() })
  })

  .post('/', async ({ body }) => {
    return organizationService.create(body)
  }, {
    body: CreateOrganizationBody
  })

  .patch('/:id', async ({ params, body }) => {
    return organizationService.update(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateOrganizationBody
  })

  .delete('/:id', async ({ params }) => {
    return organizationService.delete(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .get('/:id/members', async ({ params }) => {
    return organizationService.getMembers(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .post('/:id/members', async ({ params, body }) => {
    return organizationService.addMember(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: AddMemberBody
  })

  .delete('/:id/members/:userId', async ({ params }) => {
    return organizationService.removeMember(params.id, params.userId)
  }, {
    params: t.Object({ id: t.String(), userId: t.String() })
  })

  .get('/:id/boards', async ({ params }) => {
    return organizationService.getBoards(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .get('/user/:userId', async ({ params }) => {
    return organizationService.getUserOrganizations(params.userId)
  }, {
    params: t.Object({ userId: t.String() })
  })
