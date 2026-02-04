import { Elysia, t } from 'elysia'
import { commentService } from './comments.service'
import { authPlugin } from '../auth'
import { UnauthorizedError, NotFoundError, ForbiddenError } from '../../shared/errors'
import { CreateCommentBody, UpdateCommentBody, CommentParams, TaskCommentsParams } from './comments.model'

export const commentController = new Elysia({ prefix: '/comments' })
  .use(authPlugin)
  .get('/task/:taskId', async ({ params, query }) => {
    const limit = query.limit ? parseInt(query.limit) : 20
    return commentService.getByTaskId(params.taskId, limit, query.cursor)
  }, {
    params: TaskCommentsParams,
    query: t.Object({
      limit: t.Optional(t.String()),
      cursor: t.Optional(t.String()),
    }),
  })

  .get('/:id', async ({ params }) => {
    return commentService.getById(params.id)
  }, {
    params: CommentParams,
  })

  .post('/', async ({ body, session, set }) => {
    if (!session) throw new UnauthorizedError()
    const comment = await commentService.create({ ...body, userId: session.user.id })
    set.status = 201
    return comment
  }, {
    body: CreateCommentBody,
  })

  .patch('/:id', async ({ params, body, session }) => {
    if (!session) throw new UnauthorizedError()
    const comment = await commentService.getById(params.id)
    if (!comment) throw new NotFoundError('Comment not found')
    if (comment.userId !== session.user.id) throw new ForbiddenError()
    return commentService.update(params.id, body)
  }, {
    params: CommentParams,
    body: UpdateCommentBody,
  })

  .delete('/:id', async ({ params, session }) => {
    if (!session) throw new UnauthorizedError()
    const comment = await commentService.getById(params.id)
    if (!comment) throw new NotFoundError('Comment not found')
    if (comment.userId !== session.user.id) throw new ForbiddenError()
    return commentService.delete(params.id)
  }, {
    params: CommentParams,
  })

  .get('/:id/mentions', async ({ params }) => {
    return commentService.getMentions(params.id)
  }, {
    params: CommentParams,
  })
