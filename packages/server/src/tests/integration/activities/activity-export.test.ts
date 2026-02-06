import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { db } from '../../../db'
import { workspaces, boards, boardMembers, activities, columns, tasks } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { activityService } from '../../../modules/activities/activities.service'
import { activityRepository } from '../../../modules/activities/activities.repository'
import { boardService } from '../../../modules/boards/boards.service'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  cleanupTestUser,
  resetDatabase,
  type TestUser
} from '../../test-helpers'

describe('Activity Export', () => {
  let testAdmin: TestUser
  let testUser: TestUser
  let testWorkspace: { id: string }
  let testBoard: { id: string; name: string }
  let testColumn: { id: string }
  let testTask: { id: string }

  const app = getTestApp()

  beforeAll(async () => {
    await resetDatabase()

    testAdmin = await createTestUser()
    testUser = await createTestUser()

    const [ws] = await db.insert(workspaces).values({
      name: 'Activity Export Workspace',
      slug: 'activity-export-ws',
    }).returning()
    testWorkspace = ws

    testBoard = await boardService.createBoard({
      name: 'Activity Export Test Board',
      workspaceId: testWorkspace.id,
      ownerId: testAdmin.id,
    })

    await db.insert(boardMembers).values({
      boardId: testBoard.id,
      userId: testUser.id,
      role: 'member',
    })

    const [col] = await db.insert(columns).values({
      name: 'Test Column',
      boardId: testBoard.id,
      position: '1',
    }).returning()
    testColumn = col

    const [task] = await db.insert(tasks).values({
      title: 'Test Task',
      columnId: col.id,
      position: '1',
    }).returning()
    testTask = task

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

    await db.insert(activities).values([
      {
        boardId: testBoard.id,
        taskId: task.id,
        userId: testAdmin.id,
        action: 'created',
        targetType: 'task',
        targetId: task.id,
        changes: { title: 'Test Task' },
        createdAt: twoDaysAgo,
      },
      {
        boardId: testBoard.id,
        taskId: task.id,
        userId: testAdmin.id,
        action: 'updated',
        targetType: 'task',
        targetId: task.id,
        changes: { description: 'Updated description' },
        createdAt: yesterday,
      },
      {
        boardId: testBoard.id,
        taskId: task.id,
        userId: testUser.id,
        action: 'assigned',
        targetType: 'task',
        targetId: task.id,
        changes: { assigneeId: testUser.id },
        createdAt: now,
      },
    ])
  })

  afterAll(async () => {
    await db.delete(workspaces).where(eq(workspaces.slug, 'activity-export-ws'))
    await cleanupTestUser(testAdmin.id)
    await cleanupTestUser(testUser.id)
  })

  describe('Repository', () => {
    it('should find activities by board ID in date range', async () => {
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      const result = await activityRepository.findByBoardIdInRange(
        testBoard.id,
        threeDaysAgo,
        now
      )

      expect(result.length).toBe(3)
      expect(result[0].action).toBe('created')
      expect(result[1].action).toBe('updated')
      expect(result[2].action).toBe('assigned')
      expect(result[0].createdAt <= result[1].createdAt).toBe(true)
      expect(result[1].createdAt <= result[2].createdAt).toBe(true)
    })

    it('should stream activities by board ID in date range', async () => {
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      const streamedActivities = []
      const stream = activityRepository.streamByBoardIdInRange(
        testBoard.id,
        threeDaysAgo,
        now,
        2
      )

      for await (const activity of stream) {
        streamedActivities.push(activity)
      }

      expect(streamedActivities.length).toBe(3)
      expect(streamedActivities[0].action).toBe('created')
      expect(streamedActivities[1].action).toBe('updated')
      expect(streamedActivities[2].action).toBe('assigned')
    })
  })

  describe('Service', () => {
    it('should export activities as JSON stream for admin', async () => {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = tomorrow.toISOString().split('T')[0]

      const result = await activityService.exportBoardActivities(
        testBoard.id,
        testAdmin.id,
        dateFrom,
        dateTo,
        'json'
      )

      expect(result.stream).toBeDefined()
      expect(result.filename).toContain('activity-export-test-board')
      expect(result.filename).toContain('activities')
      expect(result.filename).toContain(dateFrom)
      expect(result.filename).toContain(dateTo)
      expect(result.filename).toEndWith('.json')
      expect(result.contentType).toBe('application/json')

      const reader = result.stream.getReader()
      const chunks = []
      let done = false
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (value) chunks.push(value)
        done = readerDone
      }

      const content = new TextDecoder().decode(Buffer.concat(chunks))
      const data = JSON.parse(content)

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('boardId')
      expect(data[0]).toHaveProperty('taskId')
      expect(data[0]).toHaveProperty('userId')
      expect(data[0]).toHaveProperty('userName')
      expect(data[0]).toHaveProperty('action')
      expect(data[0]).toHaveProperty('targetType')
      expect(data[0]).toHaveProperty('targetId')
      expect(data[0]).toHaveProperty('changes')
      expect(data[0]).toHaveProperty('createdAt')
    })

    it('should export activities as CSV stream for admin', async () => {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = tomorrow.toISOString().split('T')[0]

      const result = await activityService.exportBoardActivities(
        testBoard.id,
        testAdmin.id,
        dateFrom,
        dateTo,
        'csv'
      )

      expect(result.stream).toBeDefined()
      expect(result.filename).toContain('activity-export-test-board')
      expect(result.filename).toEndWith('.csv')
      expect(result.contentType).toBe('text/csv')

      const reader = result.stream.getReader()
      const chunks = []
      let done = false
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        if (value) chunks.push(value)
        done = readerDone
      }

      const content = new TextDecoder().decode(Buffer.concat(chunks))
      const lines = content.split('\n')

      expect(lines[0]).toContain('id,boardId,taskId,userId,userName,action,targetType,targetId,changes,createdAt')
      expect(lines.length).toBeGreaterThan(1)
      expect(lines[1]).toContain('created')
      expect(lines[2]).toContain('updated')
      expect(lines[3]).toContain('assigned')
    })

    it('should throw ForbiddenError for non-admin user', async () => {
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = now.toISOString().split('T')[0]

      expect(
        activityService.exportBoardActivities(
          testBoard.id,
          testUser.id,
          dateFrom,
          dateTo,
          'json'
        )
      ).rejects.toThrow('Only board admins can export activities')
    })

    it('should throw BadRequestError for invalid date range', async () => {
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = now.toISOString().split('T')[0]
      const dateTo = threeDaysAgo.toISOString().split('T')[0]

      expect(
        activityService.exportBoardActivities(
          testBoard.id,
          testAdmin.id,
          dateFrom,
          dateTo,
          'json'
        )
      ).rejects.toThrow('dateFrom cannot be after dateTo')
    })

    it('should throw BadRequestError for date range over 365 days', async () => {
      const now = new Date()
      const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
      const dateFrom = twoYearsAgo.toISOString().split('T')[0]
      const dateTo = now.toISOString().split('T')[0]

      expect(
        activityService.exportBoardActivities(
          testBoard.id,
          testAdmin.id,
          dateFrom,
          dateTo,
          'json'
        )
      ).rejects.toThrow('Date range cannot exceed 365 days')
    })
  })

  describe('API Endpoints', () => {
    const parseStreamResponse = async (res: Response): Promise<string> => {
      const content = await res.text()
      const chunks: number[] = []
      let remaining = content
      
      while (remaining.length > 0) {
        try {
          let depth = 0
          let endIndex = 0
          for (let i = 0; i < remaining.length; i++) {
            if (remaining[i] === '{') depth++
            else if (remaining[i] === '}') {
              depth--
              if (depth === 0) {
                endIndex = i + 1
                break
              }
            }
          }
          
          if (endIndex === 0) break
          
          const jsonStr = remaining.slice(0, endIndex)
          remaining = remaining.slice(endIndex)
          
          const parsed = JSON.parse(jsonStr)
          if (typeof parsed === 'object' && parsed !== null && '0' in parsed) {
            const bytes = Object.values(parsed) as number[]
            chunks.push(...bytes)
          }
        } catch {
          break
        }
      }
      
      if (chunks.length > 0) {
        return new TextDecoder().decode(new Uint8Array(chunks))
      }
      
      try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed) && parsed.every(v => typeof v === 'number')) {
          return new TextDecoder().decode(new Uint8Array(parsed))
        }
      } catch {
        // Not a JSON array, return as-is
      }
      
      return content
    }

    it('GET /v1/activities/board/:id/export should return 200 for board admin', async () => {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = tomorrow.toISOString().split('T')[0]

      const res = await app.handle(
        new Request(
          `http://localhost/v1/activities/board/${testBoard.id}/export?dateFrom=${dateFrom}&dateTo=${dateTo}&format=json`,
          {
            headers: getAuthHeaders(testAdmin)
          }
        )
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/json')
      expect(res.headers.get('Content-Disposition')).toContain('attachment')
      expect(res.headers.get('Content-Disposition')).toContain('activity-export-test-board')
      expect(res.headers.get('Content-Disposition')).toContain('.json')

      const parsedContent = await parseStreamResponse(res)
      const data = JSON.parse(parsedContent)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(3)
    })

    it('GET /v1/activities/board/:id/export should return 403 for non-admin', async () => {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = tomorrow.toISOString().split('T')[0]

      const res = await app.handle(
        new Request(
          `http://localhost/v1/activities/board/${testBoard.id}/export?dateFrom=${dateFrom}&dateTo=${dateTo}&format=json`,
          {
            headers: getAuthHeaders(testUser)
          }
        )
      )

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Only board admins can export activities')
    })

    it('GET /v1/activities/board/:id/export should return 400 when dateFrom is after dateTo', async () => {
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = now.toISOString().split('T')[0]
      const dateTo = threeDaysAgo.toISOString().split('T')[0]

      const res = await app.handle(
        new Request(
          `http://localhost/v1/activities/board/${testBoard.id}/export?dateFrom=${dateFrom}&dateTo=${dateTo}&format=json`,
          {
            headers: getAuthHeaders(testAdmin)
          }
        )
      )

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('dateFrom cannot be after dateTo')
    })

    it('GET /v1/activities/board/:id/export should return 400 when date range exceeds 365 days', async () => {
      const now = new Date()
      const twoYearsAgo = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
      const dateFrom = twoYearsAgo.toISOString().split('T')[0]
      const dateTo = now.toISOString().split('T')[0]

      const res = await app.handle(
        new Request(
          `http://localhost/v1/activities/board/${testBoard.id}/export?dateFrom=${dateFrom}&dateTo=${dateTo}&format=json`,
          {
            headers: getAuthHeaders(testAdmin)
          }
        )
      )

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.message).toContain('Date range cannot exceed 365 days')
    })

    it('GET /v1/activities/board/:id/export should return CSV for format=csv', async () => {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = tomorrow.toISOString().split('T')[0]

      const res = await app.handle(
        new Request(
          `http://localhost/v1/activities/board/${testBoard.id}/export?dateFrom=${dateFrom}&dateTo=${dateTo}&format=csv`,
          {
            headers: getAuthHeaders(testAdmin)
          }
        )
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('text/csv')
      expect(res.headers.get('Content-Disposition')).toContain('.csv')

      const parsedContent = await parseStreamResponse(res)
      const lines = parsedContent.split('\n')
      expect(lines[0]).toContain('id,boardId,taskId,userId,userName,action,targetType,targetId,changes,createdAt')
      expect(lines.length).toBeGreaterThan(1)
    })

    it('GET /v1/activities/board/:id/export filename should include board name and date range', async () => {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const dateFrom = threeDaysAgo.toISOString().split('T')[0]
      const dateTo = tomorrow.toISOString().split('T')[0]

      const res = await app.handle(
        new Request(
          `http://localhost/v1/activities/board/${testBoard.id}/export?dateFrom=${dateFrom}&dateTo=${dateTo}&format=json`,
          {
            headers: getAuthHeaders(testAdmin)
          }
        )
      )

      expect(res.status).toBe(200)
      const contentDisposition = res.headers.get('Content-Disposition')
      expect(contentDisposition).toContain('activity-export-test-board')
      expect(contentDisposition).toContain(dateFrom)
      expect(contentDisposition).toContain(dateTo)
    })
  })
})
