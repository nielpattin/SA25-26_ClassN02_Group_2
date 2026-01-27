import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { boardService } from '../modules/boards/boards.service'
import { db } from '../db'
import { boards, columns, tasks, workspaces, users } from '../db/schema'
import { eq } from 'drizzle-orm'

describe('Board Export', () => {
  let testUser: any
  let testWorkspace: any
  let testBoard: any

  beforeAll(async () => {
    // Cleanup first to avoid duplicates in case of previous failed run
    await db.delete(workspaces).where(eq(workspaces.slug, 'export-ws'))
    await db.delete(users).where(eq(users.id, 'test-user-export'))
    
    // Setup test data
    const userResult = await db.insert(users).values({
      id: 'test-user-export',
      name: 'Export Tester',
      email: 'export@example.com',
    }).returning()
    testUser = userResult[0]

    const workspaceResult = await db.insert(workspaces).values({
      name: 'Export Workspace',
      slug: 'export-ws',
    }).returning()
    testWorkspace = workspaceResult[0]

    testBoard = await boardService.createBoard({
      name: 'Export Board',
      workspaceId: testWorkspace.id,
      ownerId: testUser.id,
    })

    const [col] = await db.insert(columns).values({
      name: 'Col 1',
      boardId: testBoard.id,
      position: '1',
    }).returning()

    await db.insert(tasks).values({
      title: 'Task 1',
      columnId: col.id,
      position: '1',
    })

    // Archived items
    const [archivedCol] = await db.insert(columns).values({
      name: 'Archived Col',
      boardId: testBoard.id,
      position: '2',
      archivedAt: new Date(),
    }).returning()

    await db.insert(tasks).values({
      title: 'Archived Task',
      columnId: archivedCol.id,
      position: '1',
      archivedAt: new Date(),
    })
  })

  afterAll(async () => {
    // Final cleanup
    await db.delete(workspaces).where(eq(workspaces.slug, 'export-ws'))
    await db.delete(users).where(eq(users.id, 'test-user-export'))
  })

  it('should gather all board data for export', async () => {
    const data = await boardService.getExportData(testBoard.id, testUser.id, false)
    
    expect(data.board.id).toBe(testBoard.id)
    expect(data.columns.length).toBe(1)
    expect(data.columns[0].name).toBe('Col 1')
    expect(data.tasks.length).toBe(1)
    expect(data.tasks[0].title).toBe('Task 1')
  })

  it('should include archived items when requested', async () => {
    const data = await boardService.getExportData(testBoard.id, testUser.id, true)
    
    expect(data.columns.length).toBe(2)
    expect(data.tasks.length).toBe(2)
  })

  it('should generate a zip archive for CSV export', async () => {
    const data = await boardService.getExportData(testBoard.id, testUser.id, false)
    const archive = await boardService.exportToCsvZip(data)
    
    expect(archive).toBeDefined()
    // Archiver is a stream/event emitter
    expect(typeof archive.pipe).toBe('function')
  })
})
