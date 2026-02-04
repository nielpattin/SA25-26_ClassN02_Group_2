import { Elysia, t } from 'elysia'
import { auth } from './auth'
import { checkRateLimit } from '../../shared/middleware/rate-limit'
import { UnauthorizedError } from '../../shared/errors'

export type Session = typeof auth.$Infer.Session
export type AuthenticatedSession = NonNullable<Session>

export const authPlugin = new Elysia({ name: 'auth' })
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
  .all('/api/auth/*', ({ request }) => auth.handler(request))
  .derive({ as: 'global' }, async ({ request }) => {
    // TEST BYPASS: Allow manual session injection in tests via x-test-user-id header
    if (process.env.NODE_ENV === 'test') {
      const testUserId = request.headers.get('x-test-user-id')
      const testAdminRole = request.headers.get('x-test-admin-role')
      if (testUserId) {
        return {
          session: {
            user: {
              id: testUserId,
              email: 'test@example.com',
              emailVerified: true,
              name: 'Test User',
              createdAt: new Date(),
              updatedAt: new Date(),
              image: null,
              adminRole: testAdminRole || null
            },
            session: {
              id: 'test-session-id',
              userId: testUserId,
              expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
              token: 'test-token',
              createdAt: new Date(),
              updatedAt: new Date(),
              ipAddress: '127.0.0.1',
              userAgent: 'test'
            }
          }
        }
      }
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    })
    return { session }
  })
  .macro({
    requireAuth: {
      resolve({ session }) {
        if (!session) {
          throw new UnauthorizedError()
        }
        return { session: session as AuthenticatedSession }
      },
    },
  })

export { auth }
