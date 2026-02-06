import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  cleanupTestUser,
  type TestUser
} from '../../test-helpers'
import { templateService } from '../../../modules/templates/templates.service'
import { db } from '../../../db'
import { boardTemplates, workspaces, members, columns } from '../../../db/schema'
import { eq } from 'drizzle-orm'

describe('Marketplace API', () => {
  let user: TestUser
  let templateId: string

  const app = getTestApp()

  beforeAll(async () => {
    user = await createTestUser()
    await db.delete(boardTemplates)

    const template = await templateService.createBoardTemplate({
      name: 'Marketplace Template',
      description: 'A great template for everyone',
      columnDefinitions: [{ name: 'To Do', position: 'a0' }],
      status: 'approved',
      categories: ['Software'],
      createdBy: user.id,
    })
    templateId = template.id

    await templateService.createBoardTemplate({
      name: 'Private Template',
      description: 'Not for the public',
      columnDefinitions: [{ name: 'Private', position: 'a0' }],
      status: 'none',
      createdBy: user.id,
    })
  })

  afterAll(async () => {
    await cleanupTestUser(user.id)
  })

  test('GET /v1/templates/marketplace - returns approved templates only', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/templates/marketplace')
    )
    expect(res.status).toBe(200)
    const templates = await res.json()
    expect(Array.isArray(templates)).toBe(true)
    expect(templates.length).toBe(1)
    expect(templates[0].name).toBe('Marketplace Template')
    expect(templates[0].author).toBeDefined()
    expect(templates[0].author.name).toBeDefined()
  })

  test('GET /v1/templates/marketplace?q=... - search by name', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/templates/marketplace?q=Marketplace')
    )
    expect(res.status).toBe(200)
    const templates = await res.json()
    expect(templates.length).toBe(1)

    const res2 = await app.handle(
      new Request('http://localhost/v1/templates/marketplace?q=Missing')
    )
    const templates2 = await res2.json()
    expect(templates2.length).toBe(0)
  })

  test('GET /v1/templates/marketplace?category=... - filter by category', async () => {
    const res = await app.handle(
      new Request('http://localhost/v1/templates/marketplace?category=Software')
    )
    expect(res.status).toBe(200)
    const templates = await res.json()
    expect(templates.length).toBe(1)

    const res2 = await app.handle(
      new Request('http://localhost/v1/templates/marketplace?category=Hardware')
    )
    const templates2 = await res2.json()
    expect(templates2.length).toBe(0)
  })

  test('GET /v1/templates/marketplace/:id - get template detail', async () => {
    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}`)
    )
    expect(res.status).toBe(200)
    const template = await res.json()
    expect(template.id).toBe(templateId)
    expect(template.name).toBe('Marketplace Template')
    expect(template.author).toBeDefined()
  })

  test('POST /v1/templates/marketplace/:id/clone - clones template to workspace', async () => {
    const [workspace] = await db.insert(workspaces).values({
      name: 'Test Workspace',
      slug: `test-workspace-clone-${Math.random().toString(36).slice(2)}`,
    }).returning()
    await db.insert(members).values({
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
    })

    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${templateId}/clone`, {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          workspaceId: workspace.id,
          boardName: 'Cloned Board'
        })
      })
    )

    expect(res.status).toBe(201)
    const board = await res.json()
    expect(board.name).toBe('Cloned Board')
    expect(board.workspaceId).toBe(workspace.id)

    const cols = await db.select().from(columns).where(eq(columns.boardId, board.id))
    expect(cols.length).toBe(1)
    expect(cols[0].name).toBe('To Do')
  })

  test('POST /v1/templates/marketplace/:id/clone - rejects non-approved template', async () => {
    const [privateTemplate] = await db.insert(boardTemplates).values({
      name: 'Private Template 2',
      columnDefinitions: [{ name: 'Secret', position: 'a0' }],
      status: 'none',
      createdBy: user.id,
    }).returning()

    const res = await app.handle(
      new Request(`http://localhost/v1/templates/marketplace/${privateTemplate.id}/clone`, {
        method: 'POST',
        headers: getAuthHeaders(user),
        body: JSON.stringify({
          workspaceId: '00000000-0000-0000-0000-000000000000',
        })
      })
    )

    expect(res.status).toBe(404)
  })
})
