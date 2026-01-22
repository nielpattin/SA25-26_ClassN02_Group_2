import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Activity } from '../components/CardModalTypes'

export const activityKeys = {
  all: ['activities'] as const,
  task: (taskId: string) => [...activityKeys.all, taskId] as const,
}

export function useTaskActivity(taskId: string) {
  return useQuery({
    queryKey: activityKeys.task(taskId),
    queryFn: async () => {
      const { data, error } = await api.v1.activities.task({ taskId }).get()
      if (error) throw error
      return data as unknown as Activity[]
    },
    enabled: !!taskId,
  })
}
