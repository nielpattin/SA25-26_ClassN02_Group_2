import { Store } from '@tanstack/react-store'
import { useStore } from '@tanstack/react-store'

export type ViewMode = 'kanban' | 'calendar' | 'gantt'
export type ZoomMode = 'day' | 'week' | 'month' | 'quarter'
export type DueDateFilter = 'overdue' | 'due-today' | 'due-this-week' | 'due-this-month' | 'no-due-date'
export type TaskStatusFilter = 'active' | 'completed' | 'all'

export interface BoardFilters {
  labelIds: string[]
  assigneeIds: string[]
  dueDate: DueDateFilter | null
  status: TaskStatusFilter
}

interface BoardViewState {
  pendingFilters: BoardFilters
}

const EMPTY_FILTERS: BoardFilters = {
  labelIds: [],
  assigneeIds: [],
  dueDate: null,
  status: 'active',
}

const initialState: BoardViewState = {
  pendingFilters: { ...EMPTY_FILTERS },
}

export const boardViewStore = new Store<BoardViewState>(initialState)

export const boardViewActions = {
  setPendingFilters(filters: BoardFilters) {
    boardViewStore.setState((prev: BoardViewState) => ({
      ...prev,
      pendingFilters: filters,
    }))
  },

  setDueDate(dueDate: DueDateFilter | null) {
    boardViewStore.setState((prev: BoardViewState) => ({
      ...prev,
      pendingFilters: { ...prev.pendingFilters, dueDate },
    }))
  },

  setStatus(status: TaskStatusFilter) {
    boardViewStore.setState((prev: BoardViewState) => ({
      ...prev,
      pendingFilters: { ...prev.pendingFilters, status },
    }))
  },

  toggleLabel(labelId: string) {
    boardViewStore.setState((prev: BoardViewState) => {
      const current = prev.pendingFilters.labelIds
      const next = current.includes(labelId)
        ? current.filter((id: string) => id !== labelId)
        : [...current, labelId]
      return {
        ...prev,
        pendingFilters: { ...prev.pendingFilters, labelIds: next },
      }
    })
  },

  toggleAssignee(userId: string) {
    boardViewStore.setState((prev: BoardViewState) => {
      const current = prev.pendingFilters.assigneeIds
      const next = current.includes(userId)
        ? current.filter((id: string) => id !== userId)
        : [...current, userId]
      return {
        ...prev,
        pendingFilters: { ...prev.pendingFilters, assigneeIds: next },
      }
    })
  },

  clearFilters() {
    boardViewStore.setState(() => ({
      pendingFilters: { ...EMPTY_FILTERS },
    }))
  },
}

export function useBoardFiltersStore(activeFilters: BoardFilters) {
  const pendingFilters = useStore(boardViewStore, (s: BoardViewState) => s.pendingFilters)

  const hasActiveFilters =
    activeFilters.labelIds.length > 0 ||
    activeFilters.assigneeIds.length > 0 ||
    activeFilters.dueDate !== null ||
    activeFilters.status !== 'active'

  const hasPendingChanges =
    activeFilters.labelIds.length !== pendingFilters.labelIds.length ||
    !activeFilters.labelIds.every((id, i) => id === pendingFilters.labelIds[i]) ||
    activeFilters.assigneeIds.length !== pendingFilters.assigneeIds.length ||
    !activeFilters.assigneeIds.every((id, i) => id === pendingFilters.assigneeIds[i]) ||
    activeFilters.dueDate !== pendingFilters.dueDate ||
    activeFilters.status !== pendingFilters.status

  return {
    pendingFilters,
    hasActiveFilters,
    hasPendingChanges,
    ...boardViewActions,
  }
}
