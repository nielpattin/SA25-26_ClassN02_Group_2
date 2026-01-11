import { db } from '../../db'
import { attachments } from '../../db/schema'
import { eq } from 'drizzle-orm'
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
  }
}
