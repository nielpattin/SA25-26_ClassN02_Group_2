import { describe, test, expect, beforeAll, beforeEach, afterAll } from 'bun:test'
import {
  getTestApp,
  createTestUser,
  getAuthHeaders,
  cleanupTestUser,
  resetDatabase,
  type TestUser
} from '../../test-helpers'
import { db } from '../../../db'
import { boardTemplates, adminAuditLog } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { templateService } from '../../../modules/templates/templates.service'

describe('Marketplace Moderation Integration', () => {
  let moderator: TestUser
  let support: TestUser
  let superAdmin: TestUser
  let author: TestUser
  let regularUser: TestUser

  const app = getTestApp()

  beforeAll(async () => {
    await resetDatabase()
    moderator = await createTestUser({ adminRole: 'moderator' })
    support = await createTestUser({ adminRole: 'support' })
    superAdmin = await createTestUser({ adminRole: 'super_admin' })
    author = await createTestUser()
    regularUser = await createTestUser()
  })

  afterAll(async () => {
    await cleanupTestUser(moderator.id)
    await cleanupTestUser(support.id)
    await cleanupTestUser(superAdmin.id)
    await cleanupTestUser(author.id)
    await cleanupTestUser(regularUser.id)
  })

  beforeEach(async () => {
    await db.delete(boardTemplates)
    await db.delete(adminAuditLog)
  })

  describe('Moderation Queues - RBAC', () => {
    test('moderator can access submissions queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getAuthHeaders(moderator)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(Array.isArray(submissions)).toBe(true)
    })

    test('support can access submissions queue (read-only)', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getAuthHeaders(support)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(Array.isArray(submissions)).toBe(true)
    })

    test('super_admin can access submissions queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getAuthHeaders(superAdmin)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(Array.isArray(submissions)).toBe(true)
    })

    test('non-admin receives 403 on submissions queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getAuthHeaders(regularUser)
        })
      )
      expect(res.status).toBe(403)
    })

    test('moderator can access takedowns queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/takedowns', {
          headers: getAuthHeaders(moderator)
        })
      )
      expect(res.status).toBe(200)
      const takedowns = await res.json()
      expect(Array.isArray(takedowns)).toBe(true)
    })

    test('support can access takedowns queue (read-only)', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/takedowns', {
          headers: getAuthHeaders(support)
        })
      )
      expect(res.status).toBe(200)
      const takedowns = await res.json()
      expect(Array.isArray(takedowns)).toBe(true)
    })

    test('non-admin receives 403 on takedowns queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/takedowns', {
          headers: getAuthHeaders(regularUser)
        })
      )
      expect(res.status).toBe(403)
    })
  })

  describe('Moderation Actions - RBAC', () => {
    let pendingTemplateId: string

    beforeEach(async () => {
      const template = await templateService.createBoardTemplate({
        name: 'Test Pending Template',
        description: 'For moderation testing',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: author.id,
        submittedAt: new Date()
      })
      pendingTemplateId = template.id
    })

    test('moderator can approve template', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(moderator)
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.status).toBe('approved')
      expect(template.approvedBy).toBe(moderator.id)
      expect(template.approvedAt).toBeDefined()
    })

    test('super_admin can approve template', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(superAdmin)
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.status).toBe('approved')
    })

    test('support receives 403 on approve', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(support)
        })
      )
      expect(res.status).toBe(403)
    })

    test('non-admin receives 403 on approve', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(regularUser)
        })
      )
      expect(res.status).toBe(403)
    })

    test('moderator can reject template', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/reject`, {
          method: 'POST',
          headers: getAuthHeaders(moderator),
          body: JSON.stringify({ reason: 'inappropriate_content', comment: 'Contains offensive material' })
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.status).toBe('rejected')
    })

    test('support receives 403 on reject', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/reject`, {
          method: 'POST',
          headers: getAuthHeaders(support),
          body: JSON.stringify({ reason: 'spam' })
        })
      )
      expect(res.status).toBe(403)
    })

    test('moderator can remove approved template', async () => {
      await templateService.approveTemplate(moderator.id, pendingTemplateId)

      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/remove`, {
          method: 'POST',
          headers: getAuthHeaders(moderator)
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.takedownAt).toBeDefined()
    })

    test('support receives 403 on remove', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/remove`, {
          method: 'POST',
          headers: getAuthHeaders(support)
        })
      )
      expect(res.status).toBe(403)
    })
  })

  describe('Rejection Reasons and Visibility', () => {
    let rejectedTemplateId: string

    beforeEach(async () => {
      const template = await templateService.createBoardTemplate({
        name: 'Test Rejection Template',
        description: 'For rejection testing',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: author.id,
        submittedAt: new Date()
      })
      rejectedTemplateId = template.id
    })

    test('rejection stores reason and comment', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${rejectedTemplateId}/reject`, {
          method: 'POST',
          headers: getAuthHeaders(moderator),
          body: JSON.stringify({ 
            reason: 'copyright_violation', 
            comment: 'Contains copyrighted images without permission' 
          })
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.status).toBe('rejected')
      expect(template.rejectionReason).toBe('copyright_violation')
      expect(template.rejectionComment).toBe('Contains copyrighted images without permission')
    })

    test('rejection with reason only (no comment)', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${rejectedTemplateId}/reject`, {
          method: 'POST',
          headers: getAuthHeaders(moderator),
          body: JSON.stringify({ reason: 'spam' })
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.status).toBe('rejected')
      expect(template.rejectionReason).toBe('spam')
      expect(template.rejectionComment).toBeNull()
    })

    test('rejected template is hidden from marketplace list', async () => {
      await templateService.rejectTemplate(moderator.id, rejectedTemplateId, { 
        reason: 'inappropriate_content' 
      })

      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace')
      )
      expect(res.status).toBe(200)
      const templates = await res.json()
      expect(templates.some((t: { id: string }) => t.id === rejectedTemplateId)).toBe(false)
    })

    test('rejected template returns 404 from marketplace detail', async () => {
      await templateService.rejectTemplate(moderator.id, rejectedTemplateId, { 
        reason: 'inappropriate_content' 
      })

      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${rejectedTemplateId}`)
      )
      expect(res.status).toBe(404)
    })

    test('rejected template cannot be cloned', async () => {
      await templateService.rejectTemplate(moderator.id, rejectedTemplateId, { 
        reason: 'inappropriate_content' 
      })

      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${rejectedTemplateId}/clone`, {
          method: 'POST',
          headers: getAuthHeaders(regularUser),
          body: JSON.stringify({ workspaceId: '00000000-0000-0000-0000-000000000000' })
        })
      )
      expect(res.status).toBe(404)
    })

    test('author can see rejection reason via board template endpoint', async () => {
      await templateService.rejectTemplate(moderator.id, rejectedTemplateId, { 
        reason: 'low_quality',
        comment: 'Template lacks sufficient detail'
      })

      const res = await app.handle(
        new Request(`http://localhost/v1/templates/boards/${rejectedTemplateId}`, {
          headers: getAuthHeaders(author)
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.status).toBe('rejected')
      expect(template.rejectionReason).toBe('low_quality')
      expect(template.rejectionComment).toBe('Template lacks sufficient detail')
    })
  })

  describe('Takedown Behavior', () => {
    let approvedTemplateId: string

    beforeEach(async () => {
      const template = await templateService.createBoardTemplate({
        name: 'Test Takedown Template',
        description: 'For takedown testing',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'approved',
        createdBy: author.id,
        approvedAt: new Date(),
        approvedBy: moderator.id
      })
      approvedTemplateId = template.id
    })

    test('author can request takedown', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(author)
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.takedownRequestedAt).toBeDefined()
      expect(template.takedownAt).toBeDefined()
      
      const takedownAt = new Date(template.takedownAt)
      const now = new Date()
      const daysDiff = Math.floor((takedownAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBeGreaterThanOrEqual(6)
      expect(daysDiff).toBeLessThanOrEqual(7)
    })

    test('template is still visible immediately after takedown request', async () => {
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(author)
        })
      )

      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace')
      )
      expect(res.status).toBe(200)
      const templates = await res.json()
      expect(templates.some((t: { id: string }) => t.id === approvedTemplateId)).toBe(true)
    })

    test('template is hidden after takedownAt date passes', async () => {
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(author)
        })
      )

      await db.update(boardTemplates)
        .set({ takedownAt: new Date(Date.now() - 1000) })
        .where(eq(boardTemplates.id, approvedTemplateId))

      const listRes = await app.handle(
        new Request('http://localhost/v1/templates/marketplace')
      )
      expect(listRes.status).toBe(200)
      const templates = await listRes.json()
      expect(templates.some((t: { id: string }) => t.id === approvedTemplateId)).toBe(false)

      const detailRes = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}`)
      )
      expect(detailRes.status).toBe(404)
    })

    test('takedown request appears in takedown queue', async () => {
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(author)
        })
      )

      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/takedowns', {
          headers: getAuthHeaders(moderator)
        })
      )
      expect(res.status).toBe(200)
      const takedowns = await res.json()
      expect(takedowns.some((t: { id: string }) => t.id === approvedTemplateId)).toBe(true)
    })

    test('non-author cannot request takedown', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(regularUser)
        })
      )
      expect(res.status).toBe(403)
    })
  })

  describe('Audit Logging', () => {
    let templateId: string

    beforeEach(async () => {
      const template = await templateService.createBoardTemplate({
        name: 'Test Audit Template',
        description: 'For audit logging testing',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: author.id,
        submittedAt: new Date()
      })
      templateId = template.id
    })

    test('approve action creates audit log entry', async () => {
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${templateId}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(moderator)
        })
      )

      const logs = await db.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, templateId))
      expect(logs.length).toBeGreaterThan(0)
      const log = logs.find(l => l.action === 'template.approved')
      expect(log).toBeDefined()
      expect(log?.adminId).toBe(moderator.id)
      expect(log?.targetType).toBe('template')
    })

    test('reject action creates audit log entry with metadata', async () => {
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${templateId}/reject`, {
          method: 'POST',
          headers: getAuthHeaders(moderator),
          body: JSON.stringify({ reason: 'spam', comment: 'Too many similar templates' })
        })
      )

      const logs = await db.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, templateId))
      expect(logs.length).toBeGreaterThan(0)
      const log = logs.find(l => l.action === 'template.rejected')
      expect(log).toBeDefined()
      expect(log?.adminId).toBe(moderator.id)
      expect(log?.metadata).toMatchObject({
        reason: 'spam',
        comment: 'Too many similar templates'
      })
    })

    test('remove action creates audit log entry', async () => {
      await templateService.approveTemplate(moderator.id, templateId)

      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${templateId}/remove`, {
          method: 'POST',
          headers: getAuthHeaders(moderator)
        })
      )

      const logs = await db.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, templateId))
      expect(logs.length).toBeGreaterThan(0)
      const log = logs.find(l => l.action === 'template.removed')
      expect(log).toBeDefined()
      expect(log?.adminId).toBe(moderator.id)
    })
  })

  describe('Submissions Queue Filtering', () => {
    beforeEach(async () => {
      await templateService.createBoardTemplate({
        name: 'Pending Template 1',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: author.id,
        submittedAt: new Date(),
        categories: ['Work', 'Productivity']
      })

      await templateService.createBoardTemplate({
        name: 'Pending Template 2',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: author.id,
        submittedAt: new Date(Date.now() - 86400000),
        categories: ['Personal']
      })

      await templateService.createBoardTemplate({
        name: 'Approved Template',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'approved',
        createdBy: author.id,
        submittedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: moderator.id,
        categories: ['Work']
      })
    })

    test('submissions sorted by submittedAt ascending (oldest first)', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getAuthHeaders(moderator)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      
      expect(submissions.length).toBe(2)
      expect(submissions.every((s: { status: string }) => s.status === 'pending')).toBe(true)
      
      if (submissions.length >= 2) {
        const firstDate = new Date(submissions[0].submittedAt).getTime()
        const secondDate = new Date(submissions[1].submittedAt).getTime()
        expect(firstDate).toBeLessThanOrEqual(secondDate)
      }
    })

    test('filter by status', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions?status=pending', {
          headers: getAuthHeaders(moderator)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(submissions.every((s: { status: string }) => s.status === 'pending')).toBe(true)
    })

    test('filter by category', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions?category=Work', {
          headers: getAuthHeaders(moderator)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(submissions.every((s: { categories?: string[] }) => s.categories?.includes('Work'))).toBe(true)
    })
  })
})
