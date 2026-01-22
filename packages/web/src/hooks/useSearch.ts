import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export interface BoardSearchResult {
  type: 'board'
  id: string
  name: string
  description: string | null
  workspaceId: string | null
  rank: number
}

export interface TaskSearchResult {
  type: 'task'
  id: string
  title: string
  description: string | null
  columnId: string
  boardId: string
  boardName: string
  rank: number
}

export type SearchResult = BoardSearchResult | TaskSearchResult

export interface SearchResponse {
  data: SearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface SearchOptions {
  scope?: 'all' | 'boards' | 'tasks'
  boardId?: string
  page?: number
  limit?: number
}

// Query key factory for consistent key usage
export const searchKeys = {
  all: ['search'] as const,
  query: (q: string, options: SearchOptions = {}) => 
    [...searchKeys.all, q, options] as const,
}

/**
 * Hook to search boards and tasks
 * Only fetches when query is at least 2 characters
 */
export function useSearch(query: string, options: SearchOptions = {}) {
  const { scope = 'all', boardId, page = 1, limit = 20 } = options

  return useQuery({
    queryKey: searchKeys.query(query, options),
    queryFn: async (): Promise<SearchResponse> => {
      const { data, error } = await api.v1.search.get({
        query: {
          q: query,
          scope,
          boardId,
          page,
          limit,
        },
      })
      if (error) throw error
      return data as SearchResponse
    },
    enabled: query.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  })
}
