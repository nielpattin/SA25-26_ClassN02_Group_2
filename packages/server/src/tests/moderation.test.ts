import { describe, test, expect, beforeAll, beforeEach } from 'bun:test'
import { app } from '../index'
import { getAuthHeaders, ensureTestUser, TEST_USER_ID } from './helpers'
import { db } from '../db'
import { boardTemplates, boards, users, adminAuditLog } from '../db/schema'
import { eq } from 'drizzle-orm'
import { templateService } from '../modules/templates/templates.service'

// Helper to get headers with admin role
const getModeratorHeaders = (userId = TEST_USER_ID) => ({
  ...getAuthHeaders(userId),
  'x-test-admin-role': 'moderator'
})

const getSupportHeaders = (userId: string) => ({
  ...getAuthHeaders(userId),
  'x-test-admin-role': 'support'
})

const getSuperAdminHeaders = (userId: string) => ({
  ...getAuthHeaders(userId),
  'x-test-admin-role': 'super_admin'
})

describe('Marketplace Moderation Integration', () => {
  const MODERATOR_ID = '00000000-0000-4000-a000-000000000002'
  const SUPPORT_ID = '00000000-0000-4000-a000-000000000003'
  const SUPER_ADMIN_ID = '00000000-0000-4000-a000-000000000004'
  const AUTHOR_ID = '00000000-0000-4000-a000-000000000005'
  const REGULAR_USER_ID = '00000000-0000-4000-a000-000000000006'

  beforeAll(async () => {
    // Ensure all test users exist
    await ensureTestUser(MODERATOR_ID)
    await ensureTestUser(SUPPORT_ID)
    await ensureTestUser(SUPER_ADMIN_ID)
    await ensureTestUser(AUTHOR_ID)
    await ensureTestUser(REGULAR_USER_ID)

    // Set up admin roles
    await db.update(users).set({ adminRole: 'moderator' }).where(eq(users.id, MODERATOR_ID))
    await db.update(users).set({ adminRole: 'support' }).where(eq(users.id, SUPPORT_ID))
    await db.update(users).set({ adminRole: 'super_admin' }).where(eq(users.id, SUPER_ADMIN_ID))
    await db.update(users).set({ adminRole: null }).where(eq(users.id, AUTHOR_ID))
    await db.update(users).set({ adminRole: null }).where(eq(users.id, REGULAR_USER_ID))
  })

  beforeEach(async () => {
    // Clean up templates before each test
    await db.delete(boardTemplates)
    // Clean up audit logs
    await db.delete(adminAuditLog)
  })

  describe('Moderation Queues - RBAC', () => {
    test('moderator can access submissions queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(Array.isArray(submissions)).toBe(true)
    })

    test('support can access submissions queue (read-only)', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getSupportHeaders(SUPPORT_ID)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(Array.isArray(submissions)).toBe(true)
    })

    test('super_admin can access submissions queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getSuperAdminHeaders(SUPER_ADMIN_ID)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(Array.isArray(submissions)).toBe(true)
    })

    test('non-admin receives 403 on submissions queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getAuthHeaders(REGULAR_USER_ID)
        })
      )
      expect(res.status).toBe(403)
    })

    test('moderator can access takedowns queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/takedowns', {
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )
      expect(res.status).toBe(200)
      const takedowns = await res.json()
      expect(Array.isArray(takedowns)).toBe(true)
    })

    test('support can access takedowns queue (read-only)', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/takedowns', {
          headers: getSupportHeaders(SUPPORT_ID)
        })
      )
      expect(res.status).toBe(200)
      const takedowns = await res.json()
      expect(Array.isArray(takedowns)).toBe(true)
    })

    test('non-admin receives 403 on takedowns queue', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/takedowns', {
          headers: getAuthHeaders(REGULAR_USER_ID)
        })
      )
      expect(res.status).toBe(403)
    })
  })

  describe('Moderation Actions - RBAC', () => {
    let pendingTemplateId: string

    beforeEach(async () => {
      // Create a pending template for testing
      const template = await templateService.createBoardTemplate({
        name: 'Test Pending Template',
        description: 'For moderation testing',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: AUTHOR_ID,
        submittedAt: new Date()
      })
      pendingTemplateId = template.id
    })

    test('moderator can approve template', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/approve`, {
          method: 'POST',
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.status).toBe('approved')
      expect(template.approvedBy).toBe(MODERATOR_ID)
      expect(template.approvedAt).toBeDefined()
    })

    test('super_admin can approve template', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/approve`, {
          method: 'POST',
          headers: getSuperAdminHeaders(SUPER_ADMIN_ID)
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
          headers: getSupportHeaders(SUPPORT_ID)
        })
      )
      expect(res.status).toBe(403)
    })

    test('non-admin receives 403 on approve', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/approve`, {
          method: 'POST',
          headers: getAuthHeaders(REGULAR_USER_ID)
        })
      )
      expect(res.status).toBe(403)
    })

    test('moderator can reject template', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/reject`, {
          method: 'POST',
          headers: getModeratorHeaders(MODERATOR_ID),
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
          headers: getSupportHeaders(SUPPORT_ID),
          body: JSON.stringify({ reason: 'spam' })
        })
      )
      expect(res.status).toBe(403)
    })

    test('moderator can remove approved template', async () => {
      // First approve the template
      await templateService.approveTemplate(MODERATOR_ID, pendingTemplateId)

      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${pendingTemplateId}/remove`, {
          method: 'POST',
          headers: getModeratorHeaders(MODERATOR_ID)
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
          headers: getSupportHeaders(SUPPORT_ID)
        })
      )
      expect(res.status).toBe(403)
    })
  })

  describe('Rejection Reasons and Visibility', () => {
    let rejectedTemplateId: string

    beforeEach(async () => {
      // Create and reject a template
      const template = await templateService.createBoardTemplate({
        name: 'Test Rejection Template',
        description: 'For rejection testing',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: AUTHOR_ID,
        submittedAt: new Date()
      })
      rejectedTemplateId = template.id
    })

    test('rejection stores reason and comment', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${rejectedTemplateId}/reject`, {
          method: 'POST',
          headers: getModeratorHeaders(MODERATOR_ID),
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
          headers: getModeratorHeaders(MODERATOR_ID),
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
      // Reject the template
      await templateService.rejectTemplate(MODERATOR_ID, rejectedTemplateId, { 
        reason: 'inappropriate_content' 
      })

      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace')
      )
      expect(res.status).toBe(200)
      const templates = await res.json()
      expect(templates.some((t: any) => t.id === rejectedTemplateId)).toBe(false)
    })

    test('rejected template returns 404 from marketplace detail', async () => {
      // Reject the template
      await templateService.rejectTemplate(MODERATOR_ID, rejectedTemplateId, { 
        reason: 'inappropriate_content' 
      })

      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${rejectedTemplateId}`)
      )
      expect(res.status).toBe(404)
    })

    test('rejected template cannot be cloned', async () => {
      // Reject the template
      await templateService.rejectTemplate(MODERATOR_ID, rejectedTemplateId, { 
        reason: 'inappropriate_content' 
      })

      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${rejectedTemplateId}/clone`, {
          method: 'POST',
          headers: getAuthHeaders(REGULAR_USER_ID),
          body: JSON.stringify({ workspaceId: '00000000-0000-0000-0000-000000000000' })
        })
      )
      expect(res.status).toBe(404)
    })

    test('author can see rejection reason via board template endpoint', async () => {
      // Reject the template with reason and comment
      await templateService.rejectTemplate(MODERATOR_ID, rejectedTemplateId, { 
        reason: 'low_quality',
        comment: 'Template lacks sufficient detail'
      })

      const res = await app.handle(
        new Request(`http://localhost/v1/templates/boards/${rejectedTemplateId}`, {
          headers: getAuthHeaders(AUTHOR_ID)
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
      // Create and approve a template
      const template = await templateService.createBoardTemplate({
        name: 'Test Takedown Template',
        description: 'For takedown testing',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'approved',
        createdBy: AUTHOR_ID,
        approvedAt: new Date(),
        approvedBy: MODERATOR_ID
      })
      approvedTemplateId = template.id
    })

    test('author can request takedown', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(AUTHOR_ID)
        })
      )
      expect(res.status).toBe(200)
      const template = await res.json()
      expect(template.takedownRequestedAt).toBeDefined()
      expect(template.takedownAt).toBeDefined()
      
      // Takedown should be scheduled 7 days in the future
      const takedownAt = new Date(template.takedownAt)
      const now = new Date()
      const daysDiff = Math.floor((takedownAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      expect(daysDiff).toBeGreaterThanOrEqual(6) // Allow for slight timing differences
      expect(daysDiff).toBeLessThanOrEqual(7)
    })

    test('template is still visible immediately after takedown request', async () => {
      // Request takedown
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(AUTHOR_ID)
        })
      )

      // Should still be visible in marketplace
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace')
      )
      expect(res.status).toBe(200)
      const templates = await res.json()
      expect(templates.some((t: any) => t.id === approvedTemplateId)).toBe(true)
    })

    test('template is hidden after takedownAt date passes', async () => {
      // Request takedown
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(AUTHOR_ID)
        })
      )

      // Manually set takedownAt to the past
      await db.update(boardTemplates)
        .set({ takedownAt: new Date(Date.now() - 1000) })
        .where(eq(boardTemplates.id, approvedTemplateId))

      // Should be hidden from marketplace list
      const listRes = await app.handle(
        new Request('http://localhost/v1/templates/marketplace')
      )
      expect(listRes.status).toBe(200)
      const templates = await listRes.json()
      expect(templates.some((t: any) => t.id === approvedTemplateId)).toBe(false)

      // Should return 404 from detail
      const detailRes = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}`)
      )
      expect(detailRes.status).toBe(404)
    })

    test('takedown request appears in takedown queue', async () => {
      // Request takedown
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(AUTHOR_ID)
        })
      )

      // Check takedown queue
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/takedowns', {
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )
      expect(res.status).toBe(200)
      const takedowns = await res.json()
      expect(takedowns.some((t: any) => t.id === approvedTemplateId)).toBe(true)
    })

    test('non-author cannot request takedown', async () => {
      const res = await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${approvedTemplateId}/takedown`, {
          method: 'POST',
          headers: getAuthHeaders(REGULAR_USER_ID)
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
        createdBy: AUTHOR_ID,
        submittedAt: new Date()
      })
      templateId = template.id
    })

    test('approve action creates audit log entry', async () => {
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${templateId}/approve`, {
          method: 'POST',
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )

      const logs = await db.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, templateId))
      expect(logs.length).toBeGreaterThan(0)
      const log = logs.find(l => l.action === 'template.approved')
      expect(log).toBeDefined()
      expect(log?.adminId).toBe(MODERATOR_ID)
      expect(log?.targetType).toBe('template')
    })

    test('reject action creates audit log entry with metadata', async () => {
      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${templateId}/reject`, {
          method: 'POST',
          headers: getModeratorHeaders(MODERATOR_ID),
          body: JSON.stringify({ reason: 'spam', comment: 'Too many similar templates' })
        })
      )

      const logs = await db.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, templateId))
      expect(logs.length).toBeGreaterThan(0)
      const log = logs.find(l => l.action === 'template.rejected')
      expect(log).toBeDefined()
      expect(log?.adminId).toBe(MODERATOR_ID)
      expect(log?.metadata).toMatchObject({
        reason: 'spam',
        comment: 'Too many similar templates'
      })
    })

    test('remove action creates audit log entry', async () => {
      // First approve
      await templateService.approveTemplate(MODERATOR_ID, templateId)

      await app.handle(
        new Request(`http://localhost/v1/templates/marketplace/${templateId}/remove`, {
          method: 'POST',
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )

      const logs = await db.select().from(adminAuditLog).where(eq(adminAuditLog.targetId, templateId))
      expect(logs.length).toBeGreaterThan(0)
      const log = logs.find(l => l.action === 'template.removed')
      expect(log).toBeDefined()
      expect(log?.adminId).toBe(MODERATOR_ID)
    })
  })

  describe('Submissions Queue Filtering', () => {
    beforeEach(async () => {
      // Create templates with different statuses
      await templateService.createBoardTemplate({
        name: 'Pending Template 1',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: AUTHOR_ID,
        submittedAt: new Date(),
        categories: ['Work', 'Productivity']
      })

      await templateService.createBoardTemplate({
        name: 'Pending Template 2',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'pending',
        createdBy: AUTHOR_ID,
        submittedAt: new Date(Date.now() - 86400000), // 1 day ago
        categories: ['Personal']
      })

      await templateService.createBoardTemplate({
        name: 'Approved Template',
        columnDefinitions: [{ name: 'To Do', position: 'a0' }],
        status: 'approved',
        createdBy: AUTHOR_ID,
        submittedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: MODERATOR_ID,
        categories: ['Work']
      })
    })

    test('submissions sorted by submittedAt ascending (oldest first)', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions', {
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      
      // Should only include pending templates
      expect(submissions.length).toBe(2)
      expect(submissions.every((s: any) => s.status === 'pending')).toBe(true)
      
      // Should be sorted oldest first
      if (submissions.length >= 2) {
        const firstDate = new Date(submissions[0].submittedAt).getTime()
        const secondDate = new Date(submissions[1].submittedAt).getTime()
        expect(firstDate).toBeLessThanOrEqual(secondDate)
      }
    })

    test('filter by status', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions?status=pending', {
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(submissions.every((s: any) => s.status === 'pending')).toBe(true)
    })

    test('filter by category', async () => {
      const res = await app.handle(
        new Request('http://localhost/v1/templates/marketplace/submissions?category=Work', {
          headers: getModeratorHeaders(MODERATOR_ID)
        })
      )
      expect(res.status).toBe(200)
      const submissions = await res.json()
      expect(submissions.every((s: any) => s.categories?.includes('Work'))).toBe(true)
    })
  })
})
