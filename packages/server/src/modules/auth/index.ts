import { Elysia, t } from 'elysia'
import { auth } from './auth'
import { checkRateLimit } from '../../shared/middleware/rate-limit'
import { UnauthorizedError } from '../../shared/errors'

export type Session = typeof auth.$Infer.Session
export type AuthenticatedSession = NonNullable<Session>

export const authPlugin = new Elysia({ name: 'auth' })
  .mount(auth.handler)
  .post(
    '/api/auth/forget-password',
    async ({ request, body }) => {
      const { email } = body
      await checkRateLimit(`password-reset:${email}`, 3, 60 * 60 * 1000)
      return auth.api.requestPasswordReset({
        body: { email },
        headers: request.headers,
      })
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
      }),
    },
  )
  .derive({ as: 'global' }, async ({ request }) => {
    try {
      const session = await auth.api.getSession({
        headers: request.headers
      })
      return { session }
    } catch {
      return { session: null }
    }
  })
  .macro({
    requireAuth: {
      resolve({ session }) {
        if (!session) {
          throw new UnauthorizedError()
        }
        return { session }
      },
    },
  })

export { auth }
