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
    const session = await auth.api.getSession({
      headers: request.headers,
    })
    return { session }
  })

export { auth }
