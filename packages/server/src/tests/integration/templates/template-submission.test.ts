import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  cleanupTestUser,
  resetDatabase,
  type TestUser
} from '../../test-helpers'
import { db } from '../../../db'
import { boardTemplates, boards } from '../../../db/schema'
import { eq } from 'drizzle-orm'

describe('Template Submission & Review', () => {
  let user: TestUser
  let boardId: string
  let templateId: string

  const app = getTestApp()

  beforeAll(async () => {
    await resetDatabase()
    user = await createTestUser({ adminRole: 'moderator' })
    await db.delete(boardTemplates)

    const [board] = await db.insert(boards).values({
      name: 'Board to Submit',
      ownerId: user.id,
      position: 'a0',
    }).returning()
    boardId = board.id
  })

  afterAll(async () => {
    await cleanupTestUser(user.id)
  })

  test('POST /v1/templates/marketplace/submit - submits board as template', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/templates/marketplace/submit', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          boardId,
          categories: ['Work']
        })
      })
    )

    expect(res.status).toBe(200)
    const template = await res.json()
    expect(template.status).toBe('pending')
    expect(template.categories).toContain('Work')
    templateId = template.id
  })

  test('GET /v1/templates/marketplace/submissions - list pending submissions', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/templates/marketplace/submissions', {
        headers: getAuthHeaders(user),
      })
    )

    expect(res.status).toBe(200)
    const submissions = await res.json()
    expect(submissions.length).toBe(1)
    expect(submissions[0].id).toBe(templateId)
  })

  test('POST /v1/templates/marketplace/:id/approve - admin approves template', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(user),
      })
    )

    expect(res.status).toBe(200)
    const template = await res.json()
    expect(template.status).toBe('approved')
    expect(template.approvedBy).toBe(user.id)
  })

  test('GET /v1/templates/marketplace - approved template visible', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/templates/marketplace')
    )
    expect(res.status).toBe(200)
    const templates = await res.json()
    expect(templates.some((t: { id: string }) => t.id === templateId)).toBe(true)
  })

  test('POST /v1/templates/marketplace/:id/reject - admin rejects template', async () => {
    const resSub = await app.handle(
      new Request('http://localhost/v1/templates/marketplace/submit', {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({ boardId })
      })
    )
    const newTemplate = await resSub.json()

    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${newTemplate.id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(user),
      })
    )

    expect(res.status).toBe(200)
    const template = await res.json()
    expect(template.status).toBe('rejected')
  })

  test('Permissions - non-admin cannot approve', async () => {
    const nonAdmin = await createTestUser()
    
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(nonAdmin),
      })
    )
    
    expect(res.status).toBe(403)
    await cleanupTestUser(nonAdmin.id)
  })
})
