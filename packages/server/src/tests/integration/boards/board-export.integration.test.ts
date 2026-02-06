import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../../db'
import { workspaces, users, boardMembers } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { boardService } from '../../../modules/boards/boards.service'

describe('Board Export Integration', () => {
  let testUser: any
  let testBoard: any
  let testWorkspace: any

  beforeAll(async () => {
    // Cleanup
    await db.delete(workspaces).where(eq(workspaces.slug, 'integration-export-ws'))
    await db.delete(users).where(eq(users.id, 'integration-export-user'))

    // Setup
    const [user] = await db.insert(users).values({
      id: 'integration-export-user',
      name: 'Integration Export Tester',
      email: 'integration-export@example.com',
    }).returning()
    testUser = user

    const [ws] = await db.insert(workspaces).values({
      name: 'Integration Export Workspace',
      slug: 'integration-export-ws',
    }).returning()
    testWorkspace = ws

    testBoard = await boardService.createBoard({
      name: 'Integration Export Board',
      workspaceId: testWorkspace.id,
      ownerId: testUser.id,
    })
  })

  afterAll(async () => {
    await db.delete(workspaces).where(eq(workspaces.slug, 'integration-export-ws'))
    await db.delete(users).where(eq(users.id, 'integration-export-user'))
  })

  it('GET /v1/boards/:id/export?format=json should return board data', async () => {
    // We simulate the request by calling the service/repository directly or using treaty if server is running
    // Since we are in a test environment, we can check if the data structure is correct
    const data = await boardService.getExportData(testBoard.id, testUser.id, false)
    
    expect(data.board.name).toBe('Integration Export Board')
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
