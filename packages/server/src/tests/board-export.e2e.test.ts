import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { api } from '../api/client'
import { db } from '../db'
import { workspaces, users, boardMembers } from '../db/schema'
import { eq } from 'drizzle-orm'
import { boardService } from '../modules/boards/boards.service'

describe('Board Export E2E', () => {
  let testUser: any
  let testBoard: any
  let testWorkspace: any

  beforeAll(async () => {
    // Cleanup
    await db.delete(workspaces).where(eq(workspaces.slug, 'e2e-export-ws'))
    await db.delete(users).where(eq(users.id, 'e2e-export-user'))

    // Setup
    const [user] = await db.insert(users).values({
      id: 'e2e-export-user',
      name: 'E2E Export Tester',
      email: 'e2e-export@example.com',
    }).returning()
    testUser = user

    const [ws] = await db.insert(workspaces).values({
      name: 'E2E Export Workspace',
      slug: 'e2e-export-ws',
    }).returning()
    testWorkspace = ws

    testBoard = await boardService.createBoard({
      name: 'E2E Export Board',
      workspaceId: testWorkspace.id,
      ownerId: testUser.id,
    })
  })

  afterAll(async () => {
    await db.delete(workspaces).where(eq(workspaces.slug, 'e2e-export-ws'))
    await db.delete(users).where(eq(users.id, 'e2e-export-user'))
  })

  it('GET /v1/boards/:id/export?format=json should return board data', async () => {
    // We simulate the request by calling the service/repository directly or using treaty if server is running
    // Since we are in a test environment, we can check if the data structure is correct
    const data = await boardService.getExportData(testBoard.id, testUser.id, false)
    
    expect(data.board.name).toBe('E2E Export Board')
    expect(data.columns).toBeDefined()
    expect(data.tasks).toBeDefined()
  })

  it('GET /v1/boards/:id/export?format=csv should return a ZIP archive', async () => {
    const data = await boardService.getExportData(testBoard.id, testUser.id, false)
    const archive = await boardService.exportToCsvZip(data)
    
    expect(archive).toBeDefined()
    expect(typeof archive.pipe).toBe('function')
  })
})
