import { Elysia, t } from 'elysia'
import { templateService } from './templates.service'
import { authPlugin } from '../auth'
import {
  CreateBoardTemplateBody, UpdateBoardTemplateBody,
  CreateTaskTemplateBody, UpdateTaskTemplateBody,
  TemplateParams, BoardTemplatesParams
} from './templates.model'

export const templateController = new Elysia({ prefix: '/templates' })
  .use(authPlugin)
  // Board Templates
  .get('/boards', async ({ query, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    return templateService.getBoardTemplates(session.user.id, query.organizationId)
  }, {
    query: t.Object({ organizationId: t.Optional(t.String()) }),
  })

  .get('/boards/:id', async ({ params }) => {
    return templateService.getBoardTemplateById(params.id)
  }, {
    params: TemplateParams,
  })

  .post('/boards', async ({ body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const template = await templateService.createBoardTemplate({ ...body, createdBy: session.user.id })
    set.status = 201
    return template
  }, {
    body: CreateBoardTemplateBody,
  })

  .patch('/boards/:id', async ({ params, body }) => {
    return templateService.updateBoardTemplate(params.id, body)
  }, {
    params: TemplateParams,
    body: UpdateBoardTemplateBody,
  })

  .delete('/boards/:id', async ({ params }) => {
    return templateService.deleteBoardTemplate(params.id)
  }, {
    params: TemplateParams,
  })

  // Task Templates
  .get('/tasks/board/:boardId', async ({ params }) => {
    return templateService.getTaskTemplatesByBoardId(params.boardId)
  }, {
    params: BoardTemplatesParams,
  })

  .get('/tasks/:id', async ({ params }) => {
    return templateService.getTaskTemplateById(params.id)
  }, {
    params: TemplateParams,
  })

  .post('/tasks', async ({ body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const template = await templateService.createTaskTemplate({ ...body, createdBy: session.user.id })
    set.status = 201
    return template
  }, {
    body: CreateTaskTemplateBody,
  })

  .patch('/tasks/:id', async ({ params, body }) => {
    return templateService.updateTaskTemplate(params.id, body)
  }, {
    params: TemplateParams,
    body: UpdateTaskTemplateBody,
  })

  .delete('/tasks/:id', async ({ params }) => {
    return templateService.deleteTaskTemplate(params.id)
  }, {
    params: TemplateParams,
  })
