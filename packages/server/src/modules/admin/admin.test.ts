import { describe, it, expect } from 'bun:test'
import { Elysia } from 'elysia'
import { adminGuard } from './admin.plugin'
import { AppError } from '../../shared/errors'

describe('Admin Guard', () => {
  const app = new Elysia()
    .onError(({ error, set }) => {
      console.error('Test App Error:', error)
      if (error instanceof AppError) {
        set.status = error.status
        return { error: { code: error.code, message: error.message } }
      }
      return { error: error instanceof Error ? error.message : String(error) }
    })
    .group('/admin', (app) => app
      .use(adminGuard)
      .get('/test', () => ({ success: true }))
    )

  it('should return 401 if no session', async () => {
    const res = await app.handle(
      new Request('http://localhost/admin/test')
    )
    expect(res.status).toBe(401)
  })

  it('should return 403 if user has no adminRole', async () => {
    const res = await app.handle(
      new Request('http://localhost/admin/test', {
        headers: {
          'x-test-user-id': 'user-1'
        }
      })
    )
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('should allow access if user is super_admin', async () => {
    const res = await app.handle(
      new Request('http://localhost/admin/test', {
        headers: {
          'x-test-user-id': 'admin-1',
          'x-test-admin-role': 'super_admin'
        }
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
  })

  it('should allow access if user is moderator', async () => {
    const res = await app.handle(
      new Request('http://localhost/admin/test', {
        headers: {
          'x-test-user-id': 'admin-2',
          'x-test-admin-role': 'moderator'
        }
      })
    )
    expect(res.status).toBe(200)
  })
})
