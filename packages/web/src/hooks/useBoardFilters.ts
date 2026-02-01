import { useState, useCallback } from 'react'

export interface BoardFilters {
  labelIds: string[]
  assigneeIds: string[]
  dueDate: DueDateFilter | null
  status: TaskStatusFilter
}

export type DueDateFilter = 'overdue' | 'due-today' | 'due-this-week' | 'due-this-month' | 'no-due-date'
export type TaskStatusFilter = 'active' | 'completed' | 'all'

interface UseBoardFiltersReturn {
  filters: BoardFilters
  pendingFilters: BoardFilters
  setLabelIds: (ids: string[]) => void
  setAssigneeIds: (ids: string[]) => void
  setDueDate: (filter: DueDateFilter | null) => void
  setStatus: (status: TaskStatusFilter) => void
  applyFilters: () => void
  clearFilters: () => void
  hasActiveFilters: boolean
  hasPendingChanges: boolean
}

const EMPTY_FILTERS: BoardFilters = {
  labelIds: [],
  assigneeIds: [],
  dueDate: null,
  status: 'active',
}

function getStorageKey(boardId: string): string {
  return `kyte:board-filters:${boardId}`
}

function loadFiltersFromStorage(boardId: string): BoardFilters {
  try {
    const stored = localStorage.getItem(getStorageKey(boardId))
    if (!stored) return { ...EMPTY_FILTERS }

    const parsed = JSON.parse(stored) as BoardFilters
    return {
      labelIds: Array.isArray(parsed.labelIds) ? parsed.labelIds : [],
      assigneeIds: Array.isArray(parsed.assigneeIds) ? parsed.assigneeIds : [],
      dueDate: parsed.dueDate || null,
      status: parsed.status || 'active',
    }
  } catch {
    return { ...EMPTY_FILTERS }
  }
}

function saveFiltersToStorage(boardId: string, filters: BoardFilters): void {
  try {
    localStorage.setItem(getStorageKey(boardId), JSON.stringify(filters))
  } catch {
    // Ignore localStorage errors
  }
}

function hasActiveFilters(filters: BoardFilters): boolean {
  return filters.labelIds.length > 0 || filters.assigneeIds.length > 0 || filters.dueDate !== null || filters.status !== 'active'
}

function filtersEqual(a: BoardFilters, b: BoardFilters): boolean {
  return (
    a.labelIds.length === b.labelIds.length &&
    a.labelIds.every((id, i) => id === b.labelIds[i]) &&
    a.assigneeIds.length === b.assigneeIds.length &&
    a.assigneeIds.every((id, i) => id === b.assigneeIds[i]) &&
    a.dueDate === b.dueDate &&
    a.status === b.status
  )
}

export function useBoardFilters(boardId: string): UseBoardFiltersReturn {
  const [filters, setFilters] = useState<BoardFilters>(() => loadFiltersFromStorage(boardId))
  const [pendingFilters, setPendingFilters] = useState<BoardFilters>(filters)

  // Reset filters when board changes
  const [lastBoardId, setLastBoardId] = useState(boardId)
  if (boardId !== lastBoardId) {
    const loaded = loadFiltersFromStorage(boardId)
    setFilters(loaded)
    setPendingFilters(loaded)
    setLastBoardId(boardId)
  }

  const setLabelIds = useCallback((ids: string[]) => {
    setPendingFilters(prev => ({ ...prev, labelIds: ids }))
  }, [])

  const setAssigneeIds = useCallback((ids: string[]) => {
    setPendingFilters(prev => ({ ...prev, assigneeIds: ids }))
  }, [])

  const setDueDate = useCallback((filter: DueDateFilter | null) => {
    setPendingFilters(prev => ({ ...prev, dueDate: filter }))
  }, [])

  const setStatus = useCallback((status: TaskStatusFilter) => {
    setPendingFilters(prev => ({ ...prev, status }))
  }, [])

  const applyFilters = useCallback(() => {
    setFilters(pendingFilters)
    saveFiltersToStorage(boardId, pendingFilters)
  }, [boardId, pendingFilters])

  const clearFilters = useCallback(() => {
    const empty = { ...EMPTY_FILTERS }
    setFilters(empty)
    setPendingFilters(empty)
    saveFiltersToStorage(boardId, empty)
  }, [boardId])

  return {
    filters,
    pendingFilters,
    setLabelIds,
    setAssigneeIds,
    setDueDate,
    setStatus,
    applyFilters,
    clearFilters,
    hasActiveFilters: hasActiveFilters(filters),
    hasPendingChanges: !filtersEqual(filters, pendingFilters),
  }
}
