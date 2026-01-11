import { t } from 'elysia'

export const CreateCommentBody = t.Object({
  taskId: t.String({ format: 'uuid' }),
  content: t.String({ minLength: 1 }),
})

export const UpdateCommentBody = t.Object({
  content: t.String({ minLength: 1 }),
})

export const CommentParams = t.Object({
  id: t.String({ format: 'uuid' }),
})

export const TaskCommentsParams = t.Object({
  taskId: t.String({ format: 'uuid' }),
})

export type CreateCommentInput = typeof CreateCommentBody.static
export type UpdateCommentInput = typeof UpdateCommentBody.static
