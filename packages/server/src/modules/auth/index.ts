import { Elysia } from 'elysia'
import { auth } from './auth'

export type Session = typeof auth.$Infer.Session

/**
 * Auth plugin for Elysia
 * - Mounts Better Auth handler at /api/auth/*
 * - Provides session in context via derive
 *
 * Usage in protected routes:
 * ```ts
 * .get('/protected', ({ session, set }) => {
 *   if (!session) {
 *     set.status = 401
 *     return { error: 'Unauthorized' }
 *   }
 *   return { user: session.user }
 * })
 * ```
 */
export const authPlugin = new Elysia({ name: 'auth' })
  .all('/api/auth/*', ({ request }) => auth.handler(request))
  .derive({ as: 'global' }, async ({ request }) => {
    // TEST BYPASS: Allow manual session injection in tests via x-test-user-id header
    if (process.env.NODE_ENV === 'test') {
      const testUserId = request.headers.get('x-test-user-id')
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
              image: null
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

export { auth }
