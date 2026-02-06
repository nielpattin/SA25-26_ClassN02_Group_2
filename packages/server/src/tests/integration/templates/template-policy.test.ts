import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  cleanupTestUser,
  resetDatabase,
  type TestUser
} from '../../test-helpers'
import { templateService } from '../../../modules/templates/templates.service'
import { db } from '../../../db'
import { boardTemplates } from '../../../db/schema'
import { eq } from 'drizzle-orm'

describe('Template Policy API', () => {
  let admin: TestUser
  let author: TestUser
  let templateId: string

  const app = getTestApp()

  beforeAll(async () => {
    await resetDatabase()
    admin = await createTestUser({ adminRole: 'moderator' })
    author = await createTestUser()

    const template = await templateService.createBoardTemplate({
      name: 'Policy Test Template',
      description: 'Test template for takedown policy',
      columnDefinitions: [{ name: 'To Do', position: 'a0' }],
      status: 'approved',
      createdBy: author.id,
    })
    templateId = template.id
  })

  afterAll(async () => {
    await cleanupTestUser(admin.id)
    await cleanupTestUser(author.id)
  })

  test('POST /v1/templates/marketplace/:id/takedown - author can request takedown', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/takedown`, {
        method: 'POST',
        headers: getAuthHeaders(author),
      })
    )
    expect(res.status).toBe(200)
    const template = await res.json()
    expect(template.takedownRequestedAt).toBeDefined()
    expect(template.takedownAt).toBeDefined()

    const listRes = await app.handle(
      new Request('http://localhost/v1/templates/marketplace')
    )
    const templates = await listRes.json()
    expect(templates.some((t: { id: string }) => t.id === templateId)).toBe(true)
  })

  test('POST /v1/templates/marketplace/:id/takedown - non-author cannot request takedown', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/takedown`, {
        method: 'POST',
        headers: getAuthHeaders(admin),
      })
    )
    expect(res.status).toBe(403)
  })

  test('Expired template is hidden from marketplace list and detail', async () => {
    await db.update(boardTemplates)
      .set({ takedownAt: new Date(Date.now() - 1000) })
      .where(eq(boardTemplates.id, templateId))

    const listRes = await app.handle(
      new Request('http://localhost/v1/templates/marketplace')
    )
    const templates = await listRes.json()
    expect(templates.some((t: { id: string }) => t.id === templateId)).toBe(false)

    const detailRes = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}`)
    )
    expect(detailRes.status).toBe(404)
  })

  test('POST /v1/templates/marketplace/:id/clone - blocked for removed template', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/clone`, {
        method: 'POST',
        headers: getAuthHeaders(admin),
        body: JSON.stringify({
          workspaceId: '00000000-0000-0000-0000-000000000000',
        })
      })
    )
    expect(res.status).toBe(404)
  })

  test('POST /v1/templates/marketplace/:id/remove - admin can remove immediately', async () => {
    const template = await templateService.createBoardTemplate({
      name: 'Admin Remove Template',
      columnDefinitions: [{ name: 'To Do', position: 'a0' }],
      status: 'approved',
      createdBy: author.id,
    })

    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${template.id}/remove`, {
        method: 'POST',
        headers: getAuthHeaders(admin),
      })
    )
    expect(res.status).toBe(200)

    const listRes = await app.handle(
      new Request('http://localhost/v1/templates/marketplace')
    )
    const templates = await listRes.json()
    expect(templates.some((t: { id: string }) => t.id === template.id)).toBe(false)
  })

  test('POST /v1/templates/marketplace/:id/remove - non-admin cannot remove', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/remove`, {
        method: 'POST',
        headers: getAuthHeaders(author),
      })
    )
    expect(res.status).toBe(403)
  })
})
