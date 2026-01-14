import { Elysia } from 'elysia'
import { commentService } from './comments.service'
import { auth } from '../auth/auth'
import { CreateCommentBody, UpdateCommentBody, CommentParams, TaskCommentsParams } from './comments.model'

export const commentController = new Elysia({ prefix: '/comments' })
  .derive(async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers })
    return { session }
  })
  .get('/task/:taskId', async ({ params }) => {
    return commentService.getByTaskId(params.taskId)
  }, {
    params: TaskCommentsParams,
  })

  .get('/:id', async ({ params }) => {
    return commentService.getById(params.id)
  }, {
    params: CommentParams,
  })

  .post('/', async ({ body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const comment = await commentService.create({ ...body, userId: session.user.id })
    set.status = 201
    return comment
  }, {
    body: CreateCommentBody,
  })

  .patch('/:id', async ({ params, body, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const comment = await commentService.getById(params.id)
    if (!comment) {
      set.status = 404
      return { error: 'Not found' }
    }
    if (comment.userId !== session.user.id) {
      set.status = 403
      return { error: 'Forbidden' }
    }
    return commentService.update(params.id, body)
  }, {
    params: CommentParams,
    body: UpdateCommentBody,
  })

  .delete('/:id', async ({ params, session, set }) => {
    if (!session) {
      set.status = 401
      return { error: 'Unauthorized' }
    }
    const comment = await commentService.getById(params.id)
    if (!comment) {
      set.status = 404
      return { error: 'Not found' }
    }
    if (comment.userId !== session.user.id) {
      set.status = 403
      return { error: 'Forbidden' }
    }
    return commentService.delete(params.id)
  }, {
    params: CommentParams,
  })

  .get('/:id/mentions', async ({ params }) => {
    return commentService.getMentions(params.id)
  }, {
    params: CommentParams,
  })
