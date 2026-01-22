import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type RecentBoard = {
  id: string
  name: string
  description: string | null
  visitedAt: Date
}

export const recentBoardKeys = {
  all: ['recent-boards'] as const,
  list: () => [...recentBoardKeys.all, 'list'] as const,
}

/**
 * Hook to fetch user's recently visited boards
 */
export function useRecentBoards() {
  return useQuery({
    queryKey: recentBoardKeys.list(),
    queryFn: async () => {
      const { data, error } = await api.v1.boards.recent.get()
      if (error) throw error
      return data as RecentBoard[]
    },
  })
}

/**
 * Hook to record a board visit (updates recent boards list)
 */
export function useRecordBoardVisit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (boardId: string) => {
      const { data, error } = await api.v1.boards({ id: boardId }).visit.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recentBoardKeys.all })
    },
  })
}
