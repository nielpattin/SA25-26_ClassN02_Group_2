import { commentRepository } from './comments.repository'
import type { CreateCommentInput, UpdateCommentInput } from './comments.model'

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

    const mentionedUserIds = extractMentions(data.content)
    for (const userId of mentionedUserIds) {
      await commentRepository.addMention(comment.id, userId)
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
