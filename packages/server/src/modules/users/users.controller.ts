import { Elysia, t } from 'elysia'
import { userService } from './users.service'
import { CreateUserBody, UpdateUserBody } from './users.model'

export const userController = new Elysia({ prefix: '/users' })
  .get('/', async () => {
    return userService.getAll()
  })

  .get('/:id', async ({ params }) => {
    return userService.getById(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .post('/', async ({ body }) => {
    return userService.create(body)
  }, {
    body: CreateUserBody
  })

  .patch('/:id', async ({ params, body }) => {
    return userService.update(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateUserBody
  })

  .delete('/:id', async ({ params }) => {
    return userService.delete(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })
