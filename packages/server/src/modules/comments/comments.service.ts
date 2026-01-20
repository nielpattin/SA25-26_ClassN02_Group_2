import { commentRepository } from './comments.repository'
import type { CreateCommentInput, UpdateCommentInput } from './comments.model'
import { eventBus } from '../../events/bus'
import { taskRepository } from '../tasks/tasks.repository'

const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

function extractMentions(content: string): string[] {
  const mentions: string[] = []
  let match
  while ((match = MENTION_REGEX.exec(content)) !== null) {
    mentions.push(match[2])
  }
  return mentions
}

export const commentService = {
  getByTaskId: (taskId: string) => commentRepository.findByTaskId(taskId),

  getById: (id: string) => commentRepository.findById(id),

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
