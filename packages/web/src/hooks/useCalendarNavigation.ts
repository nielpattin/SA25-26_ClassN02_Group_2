import { useState, useCallback, useEffect } from 'react'
import {
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  startOfToday,
} from 'date-fns'

export type ViewMode = 'day' | 'week' | 'month' | 'quarter'

export function useCalendarNavigation(initialViewMode: ViewMode = 'month') {
  const [currentDate, setCurrentDate] = useState(startOfToday())
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode)

  useEffect(() => {
    setViewMode(initialViewMode)
  }, [initialViewMode])

  const next = useCallback(() => {
    setCurrentDate(prev => {
      if (viewMode === 'day') return addDays(prev, 1)
      if (viewMode === 'week') return addWeeks(prev, 1)
      if (viewMode === 'quarter') return addQuarters(prev, 1)
      return addMonths(prev, 1)
    })
  }, [viewMode])

  const prev = useCallback(() => {
    setCurrentDate(prevDate => {
      if (viewMode === 'day') return subDays(prevDate, 1)
      if (viewMode === 'week') return subWeeks(prevDate, 1)
      if (viewMode === 'quarter') return subQuarters(prevDate, 1)
      return subMonths(prevDate, 1)
    })
  }, [viewMode])

  const goToToday = useCallback(() => {
    setCurrentDate(startOfToday())
  }, [])

  return {
    currentDate,
    viewMode,
    setViewMode,
    next,
    prev,
    goToToday,
  }
}
