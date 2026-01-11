import { Elysia } from 'elysia'
import { commentService } from './comments.service'
import { CreateCommentBody, UpdateCommentBody, CommentParams, TaskCommentsParams } from './comments.model'

export const commentController = new Elysia({ prefix: '/comments' })
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

  .post('/', async ({ body, set }) => {
    // TODO: Get userId from auth context
    const userId = 'temp-user-id'
    const comment = await commentService.create({ ...body, userId })
    set.status = 201
    return comment
  }, {
    body: CreateCommentBody,
  })

  .patch('/:id', async ({ params, body }) => {
    return commentService.update(params.id, body)
  }, {
    params: CommentParams,
    body: UpdateCommentBody,
  })

  .delete('/:id', async ({ params }) => {
    return commentService.delete(params.id)
  }, {
    params: CommentParams,
  })

  .get('/:id/mentions', async ({ params }) => {
    return commentService.getMentions(params.id)
  }, {
    params: CommentParams,
  })
