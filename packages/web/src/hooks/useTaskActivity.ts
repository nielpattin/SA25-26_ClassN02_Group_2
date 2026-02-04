import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import type { Activity } from '../components/CardModalTypes'

interface ActivityPage {
  items: Activity[]
  nextCursor: string | null
  hasMore: boolean
}

export const activityKeys = {
  all: ['activities'] as const,
  task: (taskId: string) => [...activityKeys.all, taskId] as const,
}

export function useTaskActivity(taskId: string, limit = 10) {
  return useInfiniteQuery({
    queryKey: activityKeys.task(taskId),
    queryFn: async ({ pageParam }) => {
      const query: Record<string, string> = { limit: String(limit) }
      if (pageParam) query.cursor = pageParam

      const { data, error } = await api.v1.activities.task({ taskId }).get({ query })
      if (error) throw error
      return data as unknown as ActivityPage
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!taskId,
  })
}
