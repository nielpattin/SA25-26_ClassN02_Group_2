import { attachmentRepository } from './attachments.repository'
import type { CreateAttachmentInput } from './attachments.model'
import { ALLOWED_MIME_TYPES } from './attachments.model'
import { taskRepository } from '../tasks/tasks.repository'
import { eventBus } from '../../events/bus'
import { getStorageProvider } from '../../lib/storage'
import { NotFoundError, UnsupportedMediaTypeError, ForbiddenError } from '../../shared/errors'

const SIGNED_URL_EXPIRY = Number(process.env.SIGNED_URL_EXPIRY) || 900

function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'text/markdown': 'md',
    'application/json': 'json',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/gzip': 'gz',
    'application/x-7z-compressed': '7z',
  }
  return mimeToExt[mimeType] ?? 'bin'
}

export const attachmentService = {
  getByTaskId: async (taskId: string) => {
    return attachmentRepository.findByTaskId(taskId)
  },

  getById: async (id: string) => {
    return attachmentRepository.getById(id)
  },

  create: async (data: CreateAttachmentInput, userId: string) => {
    const attachment = await attachmentRepository.create(data)
    const boardId = await taskRepository.getBoardIdFromTask(data.taskId)
    
    if (boardId) {
      eventBus.emitDomain('attachment.added', { attachment, userId, boardId })
    }
    return attachment
  },

  upload: async (taskId: string, file: File, userId: string) => {
    const mimeType = file.type
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new UnsupportedMediaTypeError(`File type '${mimeType}' is not allowed`)
    }

    const workspaceId = await attachmentRepository.getWorkspaceIdFromTask(taskId)
    if (!workspaceId) {
      throw new NotFoundError('Task not found or not in a workspace')
    }

    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (!boardId) {
      throw new NotFoundError('Task not found')
    }

    const fileId = crypto.randomUUID()
    const extension = getExtensionFromMimeType(mimeType)
    const storageKey = `attachments/${workspaceId}/${taskId}/${fileId}.${extension}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const storage = getStorageProvider()
    await storage.upload(storageKey, buffer, mimeType)

    const attachment = await attachmentRepository.create({
      taskId,
      type: 'file',
      url: storageKey,
      name: file.name,
      mimeType,
      size: file.size,
      uploadedBy: userId,
    })

    eventBus.emitDomain('attachment.added', { attachment, userId, boardId })

    return attachment
  },

  getDownloadUrl: async (attachmentId: string, userId: string) => {
    const attachment = await attachmentRepository.getById(attachmentId)

    if (!attachment || attachment.type === 'link') {
      throw new NotFoundError('Attachment not found')
    }

    const hasAccess = await attachmentRepository.canUserAccessAttachment(attachmentId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this attachment')
    }

    const storage = getStorageProvider()
    const url = await storage.getSignedUrl(attachment.url, SIGNED_URL_EXPIRY)

    return { url }
  },

  delete: async (id: string, userId: string): Promise<void> => {
    const attachment = await attachmentRepository.getById(id)
    if (!attachment) {
      throw new NotFoundError('Attachment not found')
    }

    const hasAccess = await attachmentRepository.canUserAccessAttachment(id, userId)
    if (!hasAccess) {
      throw new ForbiddenError('You do not have access to this attachment')
    }

    const boardId = await taskRepository.getBoardIdFromTask(attachment.taskId)

    if (attachment.type === 'file') {
      const storage = getStorageProvider()
      try {
        await storage.delete(attachment.url)
      } catch (err) {
        const isNotFound = err instanceof Error && err.name === 'NoSuchKey'
        if (!isNotFound) {
          throw err
        }
      }
    }

    await attachmentRepository.delete(id)

    if (boardId) {
      eventBus.emitDomain('attachment.deleted', {
        attachmentId: id,
        taskId: attachment.taskId,
        userId,
        boardId,
      })
    }
  },
}
