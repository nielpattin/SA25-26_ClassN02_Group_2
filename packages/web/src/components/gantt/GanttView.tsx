import { useState, useCallback } from 'react'
import { GanttHeader } from './GanttHeader'
import { GanttContainer } from './GanttContainer'
import { type ZoomMode, type TaskStatusFilter, type BoardFilters } from '../../hooks/useBoardPreferences'
import { useCalendarNavigation } from '../../hooks/useCalendarNavigation'
import type { TaskWithLabels } from '../../hooks/useTasks'

type GanttViewProps = {
  boardId: string
  tasks: TaskWithLabels[]
  onTaskClick?: (id: string) => void
  zoomMode: ZoomMode
  onZoomModeChange: (mode: ZoomMode) => void
  filters: BoardFilters
  onFiltersChange: (filters: Partial<BoardFilters>) => void
}

export function GanttView({
  boardId,
  tasks,
  onTaskClick,
  zoomMode,
  onZoomModeChange,
  filters,
  onFiltersChange,
}: GanttViewProps) {
  const [todayTrigger, setTodayTrigger] = useState(0)
  const { currentDate, next, prev, goToToday } = useCalendarNavigation(zoomMode)

  const handleStatusChange = (status: TaskStatusFilter) => {
    onFiltersChange({ status })
  }

  const handleToday = useCallback(() => {
    goToToday()
    setTodayTrigger(prev => prev + 1)
  }, [goToToday])

  const handleNext = useCallback(() => {
    next()
  }, [next])

  const handlePrev = useCallback(() => {
    prev()
  }, [prev])

  return (
    <div className="flex flex-1 min-h-0 flex-col bg-white">
      <GanttHeader 
        currentDate={currentDate}
        zoomMode={zoomMode}
        onZoomModeChange={onZoomModeChange}
        onToday={handleToday}
        onNext={handleNext}
        onPrev={handlePrev}
        status={filters.status}
        onStatusChange={handleStatusChange}
      />
      
      <GanttContainer 
        tasks={tasks} 
        boardId={boardId}
        onTaskClick={onTaskClick}
        todayTrigger={todayTrigger}
        zoomMode={zoomMode}
        currentDate={currentDate}
      />
    </div>
  )
}
