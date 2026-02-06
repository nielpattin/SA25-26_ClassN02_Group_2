import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  cleanupTestUser,
  type TestUser
} from '../../test-helpers'

describe('Admin Guard', () => {
  let regularUser: TestUser
  let superAdminUser: TestUser
  let moderatorUser: TestUser

  const app = getTestApp()

  beforeAll(async () => {
    regularUser = await createTestUser()
    superAdminUser = await createTestUser({ adminRole: 'super_admin' })
    moderatorUser = await createTestUser({ adminRole: 'moderator' })
  })

  afterAll(async () => {
    await cleanupTestUser(regularUser.id)
    await cleanupTestUser(superAdminUser.id)
    await cleanupTestUser(moderatorUser.id)
  })

  it('should return 401 if no session', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/admin/users')
    )
    expect(res.status).toBe(401)
  })

  it('should return 403 if user has no adminRole', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/admin/users', {
        headers: getAuthHeaders(regularUser)
      })
    )
    expect(res.status).toBe(403)
  })

  it('should allow access if user is super_admin', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/admin/users', {
        headers: getAuthHeaders(superAdminUser)
      })
    )
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  it('should allow access if user is moderator', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/admin/users', {
        headers: getAuthHeaders(moderatorUser)
      })
    )
    expect(res.status).toBe(200)
  })
})
