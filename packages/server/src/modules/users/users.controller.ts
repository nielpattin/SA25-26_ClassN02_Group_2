import { Elysia, t } from 'elysia'
import { userService } from './users.service'
import { CreateUserBody, UpdateUserBody, UpdateUserPreferencesBody, UpdateNotificationPreferencesBody, AvatarUploadBody, DeleteAccountBody } from './users.model'
import { authPlugin, auth } from '../auth'
import { UnauthorizedError, ForbiddenError } from '../../shared/errors'
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
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()
    
    return userService.update(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateUserBody
  })

  .post('/:id/avatar', async ({ params, body, session }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()

    return userService.uploadAvatar(params.id, body.file)
  }, {
    params: t.Object({ id: t.String() }),
    body: AvatarUploadBody
  })

  .delete('/:id/avatar', async ({ params, session }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()

    return userService.deleteAvatar(params.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .patch('/:id/preferences', async ({ params, body, session, set }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()

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

  .patch('/:id/notification-preferences', async ({ params, body, session }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()

    return userService.updateNotificationPreferences(params.id, body)
  }, {
    params: t.Object({ id: t.String() }),
    body: UpdateNotificationPreferencesBody
  })

  .post('/:id/set-password', async ({ params, body, session, request }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()

    const hash = await userService.getPasswordHash(params.id)
    if (hash) {
      throw new ForbiddenError('Password already set. Use change password instead.')
    }

    await auth.api.setPassword({
      headers: request.headers,
      body: {
        newPassword: body.password
      }
    })

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ password: t.String({ minLength: 8 }) })
  })

  .delete('/:id', async ({ params, body, session }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()

    return userService.deleteAccount(params.id, body.password)
  }, {
    params: t.Object({ id: t.String() }),
    body: DeleteAccountBody
  })

  .get('/:id/sessions', async ({ params, session }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()

    return userService.getSessions(params.id, session.session.id)
  }, {
    params: t.Object({ id: t.String() })
  })

  .delete('/:id/sessions/:sessionId', async ({ params, session, set }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()
    
    try {
      await userService.revokeSession(params.id, params.sessionId, session.session.id)
      return { success: true }
    } catch (error: any) {
      set.status = 400
      return { success: false, error: error.message }
    }
  }, {
    params: t.Object({ id: t.String(), sessionId: t.String() })
  })

  .post('/:id/sessions/revoke-all', async ({ params, session }) => {
    if (!session) throw new UnauthorizedError()
    if (session.user.id !== params.id) throw new ForbiddenError()

    const revoked = await userService.revokeAllSessions(params.id, session.session.id)
    return { success: true, count: revoked.length }
  }, {
    params: t.Object({ id: t.String() })
  })
