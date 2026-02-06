import { Elysia, t } from 'elysia'
import { commentService } from './comments.service'
import { authPlugin } from '../auth'
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../../shared/errors'
import { CreateCommentBody, UpdateCommentBody, CommentParams, TaskCommentsParams } from './comments.model'

export const commentController = new Elysia({ prefix: '/comments' })
  .use(authPlugin)
  .get('/task/:taskId', async ({ params, query, session }) => {
    const limit = query.limit ? parseInt(query.limit) : 20
    return commentService.getByTaskId(params.taskId, session.user.id, limit, query.cursor)
  }, {
    requireAuth: true,
    params: TaskCommentsParams,
    query: t.Object({
      limit: t.Optional(t.String()),
      cursor: t.Optional(t.String()),
    }),
  })

  .get('/:id', async ({ params, session }) => {
    return commentService.getById(params.id, session.user.id)
  }, {
    requireAuth: true,
    params: CommentParams,
  })

  .post('/', async ({ body, session, set }) => {
    const comment = await commentService.create({ ...body, userId: session.user.id })
    set.status = 201
    return comment
  }, {
    requireAuth: true,
    body: CreateCommentBody,
  })

  .patch('/:id', async ({ params, body, session }) => {
    const comment = await commentService.getById(params.id, session.user.id)
    if (!comment) throw new NotFoundError('Comment not found')
    if (comment.userId !== session.user.id) throw new ForbiddenError()
    return commentService.update(params.id, body)
  }, {
    requireAuth: true,
    params: CommentParams,
    body: UpdateCommentBody,
  })

  .delete('/:id', async ({ params, session }) => {
    const comment = await commentService.getById(params.id, session.user.id)
    if (!comment) throw new NotFoundError('Comment not found')
    if (comment.userId !== session.user.id) throw new ForbiddenError()
    return commentService.delete(params.id)
  }, {
    requireAuth: true,
    params: CommentParams,
  })

  .get('/:id/mentions', async ({ params }) => {
    return commentService.getMentions(params.id)
  }, {
    requireAuth: true,
    params: CommentParams,
  })
