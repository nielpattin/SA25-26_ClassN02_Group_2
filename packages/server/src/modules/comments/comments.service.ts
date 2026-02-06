import { commentRepository } from './comments.repository'
import type { CreateCommentInput, UpdateCommentInput } from './comments.model'
import { eventBus } from '../../events/bus'
import { taskRepository } from '../tasks/tasks.repository'
import { ForbiddenError } from '../../shared/errors'

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

function extractMentions(content: string): string[] {
  return [...content.matchAll(MENTION_REGEX)].map(match => match[2])
}

export const commentService = {
  getByTaskId: async (taskId: string, userId: string, limit = 20, cursor?: string) => {
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      const { boardService } = await import('../boards/boards.service')
      const hasAccess = await boardService.canAccessBoard(boardId, userId)
      if (!hasAccess) {
        throw new ForbiddenError('Access denied')
      }
    }

    const items = await commentRepository.findByTaskId(taskId, limit + 1, cursor)
    const hasMore = items.length > limit
    const data = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null

    return { items: data, nextCursor, hasMore }
  },

  getById: async (id: string, userId: string) => {
    const comment = await commentRepository.findById(id)
    if (!comment) return null

    const boardId = await taskRepository.getBoardIdFromTask(comment.taskId)
    if (boardId) {
      const { boardService } = await import('../boards/boards.service')
      const hasAccess = await boardService.canAccessBoard(boardId, userId)
      if (!hasAccess) {
        throw new ForbiddenError('Access denied')
      }
    }

    return comment
  },

  create: async (data: CreateCommentInput & { userId: string }) => {
    const comment = await commentRepository.create(data)
    const boardId = await taskRepository.getBoardIdFromTask(data.taskId)

    if (boardId) {
      eventBus.emitDomain('comment.created', { comment, boardId, userId: data.userId })
    }

    const mentionedUserIds = extractMentions(data.content)
    for (const userId of mentionedUserIds) {
      await commentRepository.addMention(comment.id, userId)
      
      if (boardId) {
        eventBus.emitDomain('comment.mention', {
          mentionedUserId: userId,
          comment,
          actorId: data.userId,
          taskId: data.taskId,
          boardId
        })
      }
    }

    return comment
  },

  update: async (id: string, data: UpdateCommentInput) => {
    const comment = await commentRepository.update(id, data)

    await commentRepository.clearMentions(id)
    const mentionedUserIds = extractMentions(data.content)
    for (const userId of mentionedUserIds) {
      await commentRepository.addMention(id, userId)
    }

    return comment
  },

  delete: (id: string) => commentRepository.softDelete(id),

  getMentions: (commentId: string) => commentRepository.getMentions(commentId),
}
