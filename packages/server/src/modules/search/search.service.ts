import { searchRepository, parseSearchQuery } from './search.repository'
import type { SearchResponse, SearchResult, BoardSearchResult, TaskSearchResult } from './search.model'

export const searchService = {
  search: async (
    userId: string,
    query: string,
    options: {
      scope?: 'all' | 'boards' | 'tasks'
      boardId?: string
      page?: number
      limit?: number
    } = {}
  ): Promise<SearchResponse> => {
    const { scope = 'all', boardId, page = 1, limit = 20 } = options
    const offset = (page - 1) * limit

    const parsed = parseSearchQuery(query)

    const assigneeUserIds = parsed.assignees.length > 0
      ? await searchRepository.resolveAssigneeUserIds(userId, parsed.assignees)
      : []

    const labelIds = parsed.labelPatterns.length > 0
      ? await searchRepository.resolveLabelIds(parsed.labelPatterns)
      : []

    const perTypeLimit = scope === 'all' ? Math.ceil(limit / 2) : limit

    const results: SearchResult[] = []
    let totalBoards = 0
    let totalTasks = 0

    const hasAssigneeFilter = assigneeUserIds.length > 0
    const hasLabelFilter = labelIds.length > 0
    const hasDueFilter = parsed.dueStatus !== null
    const hasTextQuery = parsed.text.length > 0

    if ((scope === 'all' || scope === 'boards') && hasTextQuery && !hasAssigneeFilter && !hasLabelFilter && !hasDueFilter) {
      const boardResults = await searchRepository.searchBoards(
        userId,
        parsed.text,
        perTypeLimit,
        scope === 'boards' ? offset : 0
      )

      results.push(...boardResults.results.map((b): BoardSearchResult => ({
        type: 'board',
        id: b.id,
        name: b.name,
        description: b.description,
        workspaceId: b.workspaceId,
        rank: b.rank,
      })))

      totalBoards = boardResults.total
    }

    if ((scope === 'all' || scope === 'tasks') && (hasTextQuery || hasAssigneeFilter || hasLabelFilter || hasDueFilter)) {
      const taskResults = await searchRepository.searchTasks(
        userId,
        parsed.text,
        {
          boardId,
          assigneeUserIds: hasAssigneeFilter ? assigneeUserIds : undefined,
          labelIds: hasLabelFilter ? labelIds : undefined,
          dueStatus: parsed.dueStatus ?? undefined,
        },
        perTypeLimit,
        scope === 'tasks' ? offset : 0
      )

      results.push(...taskResults.results.map((t): TaskSearchResult => ({
        type: 'task',
        id: t.id,
        title: t.title,
        description: t.description,
        columnId: t.columnId,
        boardId: t.boardId,
        boardName: t.boardName,
        rank: t.rank,
      })))

      totalTasks = taskResults.total
    }

    results.sort((a, b) => b.rank - a.rank)

    const limitedResults = scope === 'all' ? results.slice(0, limit) : results

    const total = scope === 'boards' ? totalBoards
      : scope === 'tasks' ? totalTasks
      : totalBoards + totalTasks

    return {
      data: limitedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },
}
