import { useCallback } from 'react'
import { useCalendarNavigation, type ViewMode } from '../../hooks/useCalendarNavigation'
import { CalendarHeader } from './CalendarHeader'
import { MonthView } from './MonthView'
import { WeekView } from './WeekView'
import { DayView } from './DayView'
import { type TaskWithLabels, useUpdateTask } from '../../hooks/useTasks'
import { useCalendarDragHandlers } from '../../hooks/useCalendarDragHandlers'
import { useDragContext } from '../dnd'

type CalendarViewProps = {
  boardId: string
  tasks: TaskWithLabels[]
  columns: { id: string; name: string }[]
  onTaskClick: (id: string) => void
  onAddTask: (columnId: string, title: string, dueDate?: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function CalendarView({ boardId, tasks, columns, onTaskClick, onAddTask, viewMode, onViewModeChange }: CalendarViewProps) {
  const { currentDate, next, prev, goToToday, setViewMode } = useCalendarNavigation(viewMode)
  const updateTask = useUpdateTask(boardId)
  const { draggedCardId, scrollContainerRef } = useDragContext()

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    onViewModeChange(mode)
  }, [setViewMode, onViewModeChange])

  const handleDrop = useCallback(
    ({ cardId, newDate }: { cardId: string; newDate: string }) => {
      const task = tasks.find(t => t.id === cardId)
      if (task && task.dueDate !== newDate) {
        updateTask.mutate({ taskId: cardId, dueDate: newDate })
      }
    },
    [tasks, updateTask]
  )

  const { handleMouseMove, handleMouseUp, handleCardDragStart } = useCalendarDragHandlers(handleDrop)

  return (
    <div
      className="flex flex-1 flex-col overflow-hidden bg-canvas"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onNext={next}
        onPrev={prev}
        onToday={goToToday}
        onViewModeChange={handleViewModeChange}
      />
      <div 
        className={`flex-1 overflow-auto p-6 ${draggedCardId ? 'cursor-grabbing' : ''}`}
        ref={scrollContainerRef as React.RefObject<HTMLDivElement | null>}
      >
        {viewMode === 'month' && (
          <MonthView
            currentDate={currentDate}
            tasks={tasks}
            columns={columns}
            onTaskClick={onTaskClick}
            onTaskDragStart={handleCardDragStart}
            onAddTask={onAddTask}
          />
        )}
        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            tasks={tasks}
            columns={columns}
            onTaskClick={onTaskClick}
            onTaskDragStart={handleCardDragStart}
            onAddTask={onAddTask}
          />
        )}
        {viewMode === 'day' && (
          <DayView
            currentDate={currentDate}
            tasks={tasks}
            columns={columns}
            onTaskClick={onTaskClick}
            onTaskDragStart={handleCardDragStart}
            onAddTask={onAddTask}
          />
        )}
      </div>
    </div>
  )
}
