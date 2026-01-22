import { db } from '../../db'
import { attachments, tasks, columns, boards, members, boardMembers } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import type { CreateAttachmentInput } from './attachments.model'

export const attachmentRepository = {
  findByTaskId: async (taskId: string) => {
    return db.select().from(attachments).where(eq(attachments.taskId, taskId)).orderBy(attachments.createdAt)
  },

  create: async (data: CreateAttachmentInput) => {
    const [attachment] = await db.insert(attachments).values(data).returning()
    return attachment
  },

  delete: async (id: string) => {
    const [attachment] = await db.delete(attachments).where(eq(attachments.id, id)).returning()
    return attachment
  },

  getById: async (id: string) => {
    const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id))
    return attachment
  },

  getWorkspaceIdFromTask: async (taskId: string): Promise<string | null> => {
    const result = await db.select({ workspaceId: boards.workspaceId })
      .from(tasks)
      .innerJoin(columns, eq(tasks.columnId, columns.id))
      .innerJoin(boards, eq(columns.boardId, boards.id))
      .where(eq(tasks.id, taskId))
      .limit(1)

    return result[0]?.workspaceId ?? null
  },

  canUserAccessAttachment: async (attachmentId: string, userId: string): Promise<boolean> => {
    const result = await db.select({
      boardId: boards.id,
      workspaceId: boards.workspaceId,
    })
      .from(attachments)
      .innerJoin(tasks, eq(attachments.taskId, tasks.id))
      .innerJoin(columns, eq(tasks.columnId, columns.id))
      .innerJoin(boards, eq(columns.boardId, boards.id))
      .where(eq(attachments.id, attachmentId))
      .limit(1)

    if (result.length === 0) return false

    const { boardId, workspaceId } = result[0]

    if (workspaceId) {
      const [workspaceMember] = await db.select({ id: members.id })
        .from(members)
        .where(and(eq(members.workspaceId, workspaceId), eq(members.userId, userId)))
        .limit(1)

      if (workspaceMember) return true
    }

    const [boardMember] = await db.select({ id: boardMembers.id })
      .from(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)))
      .limit(1)

    return !!boardMember
  },
}
