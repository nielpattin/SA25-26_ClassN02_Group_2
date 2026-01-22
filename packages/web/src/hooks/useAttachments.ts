import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type Attachment = {
  id: string
  taskId: string
  type: 'link' | 'file'
  url: string
  name: string
  mimeType: string | null
  size: number | null
  uploadedBy: string | null
  createdAt: Date
}

export const attachmentKeys = {
  all: ['attachments'] as const,
  lists: () => [...attachmentKeys.all, 'list'] as const,
  list: (taskId: string) => [...attachmentKeys.lists(), taskId] as const,
}

export function useAttachments(taskId: string) {
  return useQuery({
    queryKey: attachmentKeys.list(taskId),
    queryFn: async () => {
      const { data, error } = await api.v1.attachments.task({ taskId }).get()
      if (error) throw error
      return data as unknown as Attachment[]
    },
    enabled: !!taskId,
  })
}

export function useAddLinkAttachment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ name, url }: { name: string; url: string }) => {
      const { data, error } = await api.v1.attachments.post({
        taskId,
        type: 'link',
        url,
        name,
      })
      if (error) throw error
      return data as unknown as Attachment
    },
    onSuccess: (attachment) => {
      queryClient.setQueryData<Attachment[]>(
        attachmentKeys.list(taskId),
        (prev) => (prev ? [...prev, attachment] : [attachment])
      )
      queryClient.invalidateQueries({ queryKey: attachmentKeys.list(taskId) })
    },
  })
}

export type UploadProgress = {
  loaded: number
  total: number
  percent: number
}

export type UploadError = {
  status: number
  message: string
}

export function useUploadAttachment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File
      onProgress?: (progress: UploadProgress) => void
    }): Promise<Attachment> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            onProgress({
              loaded: event.loaded,
              total: event.total,
              percent: Math.round((event.loaded / event.total) * 100),
            })
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              resolve(data as Attachment)
            } catch {
              reject({ status: 500, message: 'Invalid response' })
            }
          } else {
            let message = 'Upload failed'
            if (xhr.status === 413) message = 'File too large (max 10MB)'
            else if (xhr.status === 415) message = 'File type not allowed'
            else if (xhr.status === 401) message = 'Please log in to upload files'
            reject({ status: xhr.status, message })
          }
        })

        xhr.addEventListener('error', () => {
          reject({ status: 0, message: 'Network error' })
        })

        xhr.addEventListener('abort', () => {
          reject({ status: 0, message: 'Upload cancelled' })
        })

        const formData = new FormData()
        formData.append('taskId', taskId)
        formData.append('file', file)

        xhr.open('POST', 'http://localhost:3000/v1/attachments/upload')
        xhr.withCredentials = true
        xhr.send(formData)
      })
    },
    onSuccess: (attachment) => {
      queryClient.setQueryData<Attachment[]>(
        attachmentKeys.list(taskId),
        (prev) => (prev ? [...prev, attachment] : [attachment])
      )
      queryClient.invalidateQueries({ queryKey: attachmentKeys.list(taskId) })
    },
  })
}

export function useDeleteAttachment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await api.v1.attachments({ id: attachmentId }).delete()
      if (error) throw error
    },
    onMutate: async (attachmentId) => {
      await queryClient.cancelQueries({ queryKey: attachmentKeys.list(taskId) })

      const previousAttachments = queryClient.getQueryData<Attachment[]>(
        attachmentKeys.list(taskId)
      )

      if (previousAttachments) {
        queryClient.setQueryData<Attachment[]>(
          attachmentKeys.list(taskId),
          (prev) => prev?.filter((a) => a.id !== attachmentId)
        )
      }

      return { previousAttachments }
    },
    onError: (_err, _id, context) => {
      if (context?.previousAttachments) {
        queryClient.setQueryData(attachmentKeys.list(taskId), context.previousAttachments)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.list(taskId) })
    },
  })
}

export function useDownloadAttachment() {
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const { data, error } = await api.v1.attachments({ id: attachmentId }).download.get()
      if (error) throw error
      return data as { url: string }
    },
  })
}
