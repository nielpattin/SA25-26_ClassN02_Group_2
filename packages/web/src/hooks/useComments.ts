import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Comment } from '../components/CardModalTypes'

interface CommentPage {
  items: Comment[]
  nextCursor: string | null
  hasMore: boolean
}

export const commentKeys = {
  all: ['comments'] as const,
  task: (taskId: string) => [...commentKeys.all, taskId] as const,
}

export function useComments(taskId: string, limit = 20) {
  return useInfiniteQuery({
    queryKey: commentKeys.task(taskId),
    queryFn: async ({ pageParam }) => {
      const query: Record<string, string> = { limit: String(limit) }
      if (pageParam) query.cursor = pageParam

      const { data, error } = await api.v1.comments.task({ taskId }).get({ query })
      if (error) throw error
      return data as unknown as CommentPage
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
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
