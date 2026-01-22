import { t } from 'elysia'

export const SearchQuery = t.Object({
  q: t.String({ minLength: 2, error: 'Search query must be at least 2 characters' }),
  scope: t.Optional(t.Union([
    t.Literal('all'),
    t.Literal('boards'),
    t.Literal('tasks'),
  ])),
  boardId: t.Optional(t.String()),
  page: t.Optional(t.Numeric({ minimum: 1 })),
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
})

export type SearchQueryType = typeof SearchQuery.static

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
