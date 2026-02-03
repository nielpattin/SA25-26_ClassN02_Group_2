import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useCallback, useRef, useMemo, useEffect } from 'react'

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

export interface BoardPreferences {
  view: ViewMode
  zoomMode: ZoomMode
  filters: BoardFilters
}

export const DEFAULT_PREFERENCES: BoardPreferences = {
  view: 'kanban',
  zoomMode: 'month',
  filters: {
    labelIds: [],
    assigneeIds: [],
    dueDate: null,
    status: 'active',
  },
}

export const preferenceKeys = {
  all: ['preferences'] as const,
  board: (boardId: string) => [...preferenceKeys.all, boardId] as const,
}

export function useBoardPreferences(boardId: string) {
  const query = useQuery({
    queryKey: preferenceKeys.board(boardId),
    queryFn: async () => {
      const { data, error } = await api.v1.boards({ id: boardId }).preferences.get()
      if (error) throw error
      if (!data) return DEFAULT_PREFERENCES
      return {
        view: data.view ?? DEFAULT_PREFERENCES.view,
        zoomMode: data.zoomMode ?? DEFAULT_PREFERENCES.zoomMode,
        filters: {
          ...DEFAULT_PREFERENCES.filters,
          ...(data.filters ?? {}),
        },
      } as BoardPreferences
    },
    enabled: !!boardId,
  })

  const data = useMemo(() => query.data ?? DEFAULT_PREFERENCES, [query.data])

  return {
    ...query,
    data,
  }
}

export function useSaveBoardPreferences(boardId: string) {
  const queryClient = useQueryClient()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDataRef = useRef<Partial<BoardPreferences>>({})
  const boardIdRef = useRef(boardId)

  useEffect(() => {
    boardIdRef.current = boardId
  }, [boardId])

  const saveDebounced = useCallback(
    (data: Partial<BoardPreferences>) => {
      queryClient.setQueryData(
        preferenceKeys.board(boardIdRef.current),
        (old: BoardPreferences | undefined) => {
          const base = old ?? DEFAULT_PREFERENCES
          if (data.filters) {
            return {
              ...base,
              ...data,
              filters: { ...base.filters, ...data.filters },
            }
          }
          return { ...base, ...data }
        }
      )

      if (data.filters && pendingDataRef.current.filters) {
        pendingDataRef.current = {
          ...pendingDataRef.current,
          ...data,
          filters: { ...pendingDataRef.current.filters, ...data.filters },
        }
      } else {
        pendingDataRef.current = { ...pendingDataRef.current, ...data }
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(async () => {
        if (Object.keys(pendingDataRef.current).length > 0) {
          const dataToSave = pendingDataRef.current
          pendingDataRef.current = {}

          try {
            await api.v1.boards({ id: boardIdRef.current }).preferences.put(dataToSave)
          } catch {
            // Ignore
          }
        }
        timerRef.current = null
      }, 1000)
    },
    [queryClient]
  )

  return { saveDebounced }
}
