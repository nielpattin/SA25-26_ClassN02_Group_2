import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type UploadProgress = {
  loaded: number
  total: number
  percent: number
}

export type UploadError = {
  status: number
  message: string
}

export function useAvatarUpload(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      onProgress,
    }: {
      file: File
      onProgress?: (progress: UploadProgress) => void
    }): Promise<{ id: string; image: string | null }> => {
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
              resolve(data)
            } catch {
              reject({ status: 500, message: 'Invalid response' })
            }
          } else {
            let message = 'Upload failed'
            if (xhr.status === 413) message = 'File too large (max 2MB)'
            else if (xhr.status === 415) message = 'File type not allowed'
            else if (xhr.status === 401) message = 'Please log in to upload'
            else if (xhr.status === 403) message = 'You do not have permission'
            
            try {
              const data = JSON.parse(xhr.responseText)
              if (data.message) message = data.message
            } catch {
              // Ignore parse error
            }
            
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
        formData.append('file', file)

        xhr.open('POST', `http://localhost:3000/v1/users/${userId}/avatar`)
        xhr.withCredentials = true
        xhr.send(formData)
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}

export function useDeleteAvatar(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.v1.users({ id: userId }).avatar.delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })
}
