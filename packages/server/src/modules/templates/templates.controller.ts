import { Elysia, t } from 'elysia'
import { templateService } from './templates.service'
import { authPlugin } from '../auth'
import { adminPlugin } from '../admin'
import { UnauthorizedError } from '../../shared/errors'
import {
  CreateBoardTemplateBody, UpdateBoardTemplateBody,
  CreateTaskTemplateBody, UpdateTaskTemplateBody,
  TemplateParams, BoardTemplatesParams, MarketplaceQuerySchema,
  CloneMarketplaceTemplateBody, SubmitTemplateBody
} from './templates.model'

export const templateController = new Elysia({ prefix: '/templates' })
  .use(authPlugin)
  .use(adminPlugin)
  // Marketplace
  .get('/marketplace', async ({ query }) => {
    return templateService.getMarketplaceTemplates(query)
  }, {
    query: MarketplaceQuerySchema,
  })

  .get('/marketplace/submissions', async ({ session, query, requireRole }) => {
    requireRole(['moderator', 'super_admin', 'support'])
    return templateService.getPendingSubmissions(session.user.id, query)
  }, {
    requireAuth: true,
    query: t.Object({
      status: t.Optional(t.String()),
      category: t.Optional(t.String()),
    }),
  })

  .get('/marketplace/takedowns', async ({ session, requireRole }) => {
    requireRole(['moderator', 'super_admin', 'support'])
    return templateService.getTakedownRequests(session.user.id)
  }, {
    requireAuth: true
  })

  .get('/marketplace/:id', async ({ params }) => {
    return templateService.getMarketplaceTemplateById(params.id)
  }, {
    params: TemplateParams,
  })

  .post('/marketplace/submit', async ({ body, session }) => {
    return templateService.submitTemplate(session.user.id, body)
  }, {
    requireAuth: true,
    body: SubmitTemplateBody,
  })

  .post('/marketplace/:id/approve', async ({ params, session, requireRole }) => {
    requireRole(['moderator', 'super_admin'])
    return templateService.approveTemplate(session.user.id, params.id)
  }, {
    requireAuth: true,
    params: TemplateParams,
  })

  .post('/marketplace/:id/reject', async ({ params, session, requireRole, body }) => {
    requireRole(['moderator', 'super_admin'])
    return templateService.rejectTemplate(session.user.id, params.id, body || {})
  }, {
    requireAuth: true,
    params: TemplateParams,
    body: t.Optional(t.Object({
      reason: t.Optional(t.String()),
      comment: t.Optional(t.String()),
    })),
  })

  .post('/marketplace/:id/takedown', async ({ params, session }) => {
    return templateService.requestTakedown(session.user.id, params.id)
  }, {
    requireAuth: true,
    params: TemplateParams,
  })

  .post('/marketplace/:id/remove', async ({ params, session, requireRole }) => {
    requireRole(['moderator', 'super_admin'])
    return templateService.removeTemplate(session.user.id, params.id)
  }, {
    requireAuth: true,
    params: TemplateParams,
  })

  .post('/marketplace/:id/clone', async ({ params, body, session, set }) => {
    const board = await templateService.cloneMarketplaceTemplate(params.id, body.workspaceId, session.user.id, body.boardName)
    set.status = 201
    return board
  }, {
    requireAuth: true,
    params: TemplateParams,
    body: CloneMarketplaceTemplateBody,
  })

  // Board Templates
  .get('/boards', async ({ query, session }) => {
    return templateService.getBoardTemplates(session.user.id, query.workspaceId)
  }, {
    requireAuth: true,
    query: t.Object({ workspaceId: t.Optional(t.String()) }),
  })

  .get('/boards/:id', async ({ params }) => {
    return templateService.getBoardTemplateById(params.id)
  }, {
    requireAuth: true,
    params: TemplateParams,
  })

  .post('/boards', async ({ body, session, set }) => {
    const template = await templateService.createBoardTemplate({ ...body, createdBy: session.user.id })
    set.status = 201
    return template
  }, {
    requireAuth: true,
    body: CreateBoardTemplateBody,
  })

  .patch('/boards/:id', async ({ params, body }) => {
    return templateService.updateBoardTemplate(params.id, body)
  }, {
    requireAuth: true,
    params: TemplateParams,
    body: UpdateBoardTemplateBody,
  })

  .delete('/boards/:id', async ({ params }) => {
    return templateService.deleteBoardTemplate(params.id)
  }, {
    requireAuth: true,
    params: TemplateParams,
  })

  // Task Templates
  .get('/tasks/board/:boardId', async ({ params }) => {
    return templateService.getTaskTemplatesByBoardId(params.boardId)
  }, {
    requireAuth: true,
    params: BoardTemplatesParams,
  })

  .get('/tasks/:id', async ({ params }) => {
    return templateService.getTaskTemplateById(params.id)
  }, {
    requireAuth: true,
    params: TemplateParams,
  })

  .post('/tasks', async ({ body, session, set }) => {
    const template = await templateService.createTaskTemplate({ ...body, createdBy: session.user.id })
    set.status = 201
    return template
  }, {
    requireAuth: true,
    body: CreateTaskTemplateBody,
  })

  .patch('/tasks/:id', async ({ params, body }) => {
    return templateService.updateTaskTemplate(params.id, body)
  }, {
    requireAuth: true,
    params: TemplateParams,
    body: UpdateTaskTemplateBody,
  })

  .delete('/tasks/:id', async ({ params }) => {
    return templateService.deleteTaskTemplate(params.id)
  }, {
    requireAuth: true,
    params: TemplateParams,
  })
