import { Elysia } from 'elysia'
import { authPlugin } from '../auth'
import { ForbiddenError, UnauthorizedError } from '../../shared/errors'
import { AdminRole } from './admin.model'

/**
 * Admin plugin providing role-based access control
 */
export const adminPlugin = new Elysia({ name: 'adminPlugin' })
  .use(authPlugin)
  .derive({ as: 'global' }, ({ session }) => {
    return {
      requireAdmin: () => {
        if (!session) throw new UnauthorizedError()
        if (!session.user.adminRole) throw new ForbiddenError('Admin access required')
        return session.user
      },
      requireRole: (roles: AdminRole[]) => {
        if (!session) throw new UnauthorizedError()
        if (!session.user.adminRole || !roles.includes(session.user.adminRole as AdminRole)) {
          throw new ForbiddenError(`Required role: ${roles.join(' or ')}`)
        }
        return session.user
      }
    }
  })

/**
 * Middleware that requires ANY admin role
 */
export const adminGuard = (app: Elysia) => app
  .use(adminPlugin)
  .onBeforeHandle(({ requireAdmin }) => {
    requireAdmin()
  })
