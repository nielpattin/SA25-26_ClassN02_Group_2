import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { taskKeys } from './useTasks'

export type BoardMember = {
  id: string
  userId: string
  userName: string | null
  userImage: string | null
  role: 'admin' | 'member' | 'viewer'
}

export const assigneeKeys = {
  all: ['board-members'] as const,
  list: (boardId: string) => [...assigneeKeys.all, boardId] as const,
}

export function useBoardMembers(boardId: string) {
  return useQuery({
    queryKey: assigneeKeys.list(boardId),
    queryFn: async () => {
      const { data, error } = await api.v1.boards({ id: boardId }).members.get()
      if (error) throw error
      return data as unknown as BoardMember[]
    },
    enabled: !!boardId,
  })
}

export function useAssignMember(taskId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await api.v1.tasks({ id: taskId }).assignees.post({ userId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
    },
  })
}

export function useUnassignMember(taskId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await api.v1.tasks({ id: taskId }).assignees({ userId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
    },
  })
}

export function useToggleAssignee(taskId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, isAssigned }: { userId: string; isAssigned: boolean }) => {
      if (isAssigned) {
        const { error } = await api.v1.tasks({ id: taskId }).assignees({ userId }).delete()
        if (error) throw error
      } else {
        const { error } = await api.v1.tasks({ id: taskId }).assignees.post({ userId })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
    },
  })
}
