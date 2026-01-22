import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Comment } from '../components/CardModalTypes'

export const commentKeys = {
  all: ['comments'] as const,
  task: (taskId: string) => [...commentKeys.all, taskId] as const,
}

export function useComments(taskId: string) {
  return useQuery({
    queryKey: commentKeys.task(taskId),
    queryFn: async () => {
      const { data, error } = await api.v1.comments.task({ taskId }).get()
      if (error) throw error
      return (data || []) as unknown as Comment[]
    },
    enabled: !!taskId,
  })
}

export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await api.v1.comments.post({ taskId, content })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.task(taskId) })
    },
  })
}

export function useUpdateComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { data, error } = await api.v1.comments({ id }).patch({ content })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.task(taskId) })
    },
  })
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.v1.comments({ id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: commentKeys.task(taskId) })
    },
  })
}
