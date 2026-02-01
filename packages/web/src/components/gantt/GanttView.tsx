import { useState, useMemo } from 'react'
import { GanttHeader } from './GanttHeader'
import { GanttContainer } from './GanttContainer'
import { useBoardFilters, TaskStatusFilter } from '../../hooks/useBoardFilters'
import { type ViewMode } from '../../hooks/useCalendarNavigation'
import type { TaskWithLabels } from '../../hooks/useTasks'

type GanttViewProps = {
  boardId: string
  tasks: TaskWithLabels[]
  onTaskClick?: (id: string) => void
  zoomMode: ViewMode
  onZoomModeChange: (mode: ViewMode) => void
}

export function GanttView({
  boardId,
  tasks,
  onTaskClick,
  zoomMode,
  onZoomModeChange,
}: GanttViewProps) {
  const [todayTrigger, setTodayTrigger] = useState(0)
  const { filters, setStatus, applyFilters } = useBoardFilters(boardId)

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Status filter
      if (filters.status === 'active') {
        const isCompleted = task.checklistProgress 
          ? task.checklistProgress.completed === task.checklistProgress.total && task.checklistProgress.total > 0
          : false
        return !isCompleted
      }
      if (filters.status === 'completed') {
        const isCompleted = task.checklistProgress 
          ? task.checklistProgress.completed === task.checklistProgress.total && task.checklistProgress.total > 0
          : false
        return isCompleted
      }
      return true
    })
  }, [tasks, filters.status])

  const handleStatusChange = (status: TaskStatusFilter) => {
    setStatus(status)
    // Small delay to ensure state update before apply
    setTimeout(() => applyFilters(), 0)
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <GanttHeader 
        viewMode={zoomMode}
        onViewModeChange={onZoomModeChange}
        onToday={() => setTodayTrigger(prev => prev + 1)}
        status={filters.status}
        onStatusChange={handleStatusChange}
      />
      
      <GanttContainer 
        tasks={filteredTasks} 
        boardId={boardId}
        onTaskClick={onTaskClick}
        todayTrigger={todayTrigger}
      />
    </div>
  )
}
