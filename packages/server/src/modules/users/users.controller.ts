import { Elysia, t } from 'elysia'
import { userService } from './users.service'
import { CreateUserBody, UpdateUserBody, UpdateUserPreferencesBody } from './users.model'
import { authPlugin } from '../auth'
import { UnauthorizedError } from '../../shared/errors'
import { isValidTimezone, isValidLanguage } from '../config'

export const userController = new Elysia({ prefix: '/users' })
  .use(authPlugin)
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

  .patch('/:id', async ({ params, body, session }) => {
    if (!session || session.user.id !== params.id) {
      throw new UnauthorizedError()
    }
    return userService.update(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateUserBody
  })

  .patch('/:id/preferences', async ({ params, body, session, set }) => {
    if (!session || session.user.id !== params.id) {
      throw new UnauthorizedError()
    }

    if (body.timezone && !isValidTimezone(body.timezone)) {
      set.status = 400
      return { success: false, error: 'Invalid timezone' }
    }

    if (body.locale && !isValidLanguage(body.locale)) {
      set.status = 400
      return { success: false, error: 'Invalid language' }
    }

    return userService.updatePreferences(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateUserPreferencesBody
  })

  .delete('/:id', async ({ params, session }) => {
    if (!session || session.user.id !== params.id) {
      throw new UnauthorizedError()
    }
    return userService.delete(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })
