import { useState, useCallback, useEffect } from 'react'
import { addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, startOfToday } from 'date-fns'

export type ViewMode = 'day' | 'week' | 'month'

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
      return addMonths(prev, 1)
    })
  }, [viewMode])

  const prev = useCallback(() => {
    setCurrentDate(prev => {
      if (viewMode === 'day') return subDays(prev, 1)
      if (viewMode === 'week') return subWeeks(prev, 1)
      return subMonths(prev, 1)
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
