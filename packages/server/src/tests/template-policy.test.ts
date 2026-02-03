import { describe, test, expect, beforeAll } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser, TEST_USER_ID } from './helpers'
import { templateService } from '../modules/templates/templates.service'
import { db } from '../db'
import { boardTemplates, workspaces, members } from '../db/schema'
import { eq } from 'drizzle-orm'

describe('Template Policy API', () => {
  let templateId: string
  const AUTHOR_ID = '00000000-0000-4000-a000-000000000002'
  const ADMIN_ID = TEST_USER_ID // This is an admin in templates.service.ts

  beforeAll(async () => {
    await ensureTestUser(ADMIN_ID)
    await ensureTestUser(AUTHOR_ID)
    await db.delete(boardTemplates)

    const template = await templateService.createBoardTemplate({
      name: 'Policy Test Template',
      description: 'Test template for takedown policy',
      columnDefinitions: [{ name: 'To Do', position: 'a0' }],
      status: 'approved',
      createdBy: AUTHOR_ID,
    })
    templateId = template.id
  })

  test('POST /v1/templates/marketplace/:id/takedown - author can request takedown', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/takedown`, {
        method: 'POST',
        headers: getAuthHeaders(AUTHOR_ID),
      })
    )
    expect(res.status).toBe(200)
    const template = await res.json()
    expect(template.takedownRequestedAt).toBeDefined()
    expect(template.takedownAt).toBeDefined()

    // It should still be visible because 7 days haven't passed
    const listRes = await app.handle(
      new Request('http://localhost/v1/templates/marketplace')
    )
    const templates = await listRes.json()
    expect(templates.some((t: any) => t.id === templateId)).toBe(true)
  })

  test('POST /v1/templates/marketplace/:id/takedown - non-author cannot request takedown', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/takedown`, {
        method: 'POST',
        headers: getAuthHeaders(ADMIN_ID), // Admin is not the author
      })
    )
    expect(res.status).toBe(403)
  })

  test('Expired template is hidden from marketplace list and detail', async () => {
    // Manually set takedownAt to the past
    await db.update(boardTemplates)
      .set({ takedownAt: new Date(Date.now() - 1000) })
      .where(eq(boardTemplates.id, templateId))

    // Should be hidden from list
    const listRes = await app.handle(
      new Request('http://localhost/v1/templates/marketplace')
    )
    const templates = await listRes.json()
    expect(templates.some((t: any) => t.id === templateId)).toBe(false)

    // Should return 404 from detail
    const detailRes = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}`)
    )
    expect(detailRes.status).toBe(404)
  })

  test('POST /v1/templates/marketplace/:id/clone - blocked for removed template', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/clone`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          workspaceId: '00000000-0000-0000-0000-000000000000', // Dummy
        })
      })
    )
    expect(res.status).toBe(404)
  })

  test('POST /v1/templates/marketplace/:id/remove - admin can remove immediately', async () => {
    // Create another template
    const template = await templateService.createBoardTemplate({
      name: 'Admin Remove Template',
      columnDefinitions: [{ name: 'To Do', position: 'a0' }],
      status: 'approved',
      createdBy: AUTHOR_ID,
    })

    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${template.id}/remove`, {
        method: 'POST',
        headers: getAuthHeaders(ADMIN_ID),
      })
    )
    expect(res.status).toBe(200)

    // Should be hidden from list
    const listRes = await app.handle(
      new Request('http://localhost/v1/templates/marketplace')
    )
    const templates = await listRes.json()
    expect(templates.some((t: any) => t.id === template.id)).toBe(false)
  })

  test('POST /v1/templates/marketplace/:id/remove - non-admin cannot remove', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/remove`, {
        method: 'POST',
        headers: getAuthHeaders(AUTHOR_ID),
      })
    )
    expect(res.status).toBe(403)
  })
})
