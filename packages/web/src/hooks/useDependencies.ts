import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish'

export type TaskDependency = {
  id: string
  blockingTaskId: string
  blockedTaskId: string
  type: DependencyType
  createdAt: Date
}

export const dependencyKeys = {
  all: ['dependencies'] as const,
  lists: () => [...dependencyKeys.all, 'list'] as const,
  list: (boardId: string) => [...dependencyKeys.lists(), boardId] as const,
  task: (taskId: string) => [...dependencyKeys.all, 'task', taskId] as const,
}

export function useDependencies(boardId: string) {
  return useQuery({
    queryKey: dependencyKeys.list(boardId),
    queryFn: async () => {
      const { data, error } = await api.v1.boards({ id: boardId }).dependencies.get()
      if (error) throw error
      return data as TaskDependency[]
    },
    enabled: !!boardId,
  })
}

export function useCreateDependency(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { blockingTaskId: string; blockedTaskId: string; type?: DependencyType }) => {
      const { data, error } = await api.v1.tasks({ id: input.blockingTaskId }).dependencies.post({
        blockedTaskId: input.blockedTaskId,
        type: input.type,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dependencyKeys.list(boardId) })
    },
  })
}

export function useDeleteDependency(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.v1.dependencies({ id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dependencyKeys.list(boardId) })
    },
  })
}
