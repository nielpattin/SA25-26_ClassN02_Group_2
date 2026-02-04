import { db } from '../../db'
import { comments, commentMentions, users } from '../../db/schema'
import { eq, and, isNull, asc, gt } from 'drizzle-orm'
import type { CreateCommentInput, UpdateCommentInput } from './comments.model'

export const commentRepository = {
  findByTaskId: async (taskId: string, limit = 20, cursor?: string) => {
    const conditions = [eq(comments.taskId, taskId), isNull(comments.deletedAt)]

    if (cursor) {
      conditions.push(gt(comments.createdAt, new Date(cursor)))
    }

    return db.select({
      id: comments.id,
      taskId: comments.taskId,
      userId: comments.userId,
      content: comments.content,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userName: users.name,
      userImage: users.image,
    })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(and(...conditions))
      .orderBy(asc(comments.createdAt))
      .limit(limit)
  },

  findById: async (id: string) => {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id))
    return comment
  },

  create: async (data: CreateCommentInput & { userId: string }) => {
    const [comment] = await db.insert(comments).values(data).returning()
    return comment
  },

  update: async (id: string, data: UpdateCommentInput) => {
    const [comment] = await db.update(comments).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(comments.id, id)).returning()
    return comment
  },

  softDelete: async (id: string) => {
    const [comment] = await db.update(comments).set({
      deletedAt: new Date(),
    }).where(eq(comments.id, id)).returning()
    return comment
  },

  addMention: async (commentId: string, userId: string) => {
    const [mention] = await db.insert(commentMentions).values({
      commentId,
      userId,
    }).returning()
    return mention
  },

  getMentions: async (commentId: string) => {
    return db.select({
      userId: commentMentions.userId,
      userName: users.name,
    })
      .from(commentMentions)
      .leftJoin(users, eq(commentMentions.userId, users.id))
      .where(eq(commentMentions.commentId, commentId))
  },

  clearMentions: async (commentId: string) => {
    await db.delete(commentMentions).where(eq(commentMentions.commentId, commentId))
  },
}
