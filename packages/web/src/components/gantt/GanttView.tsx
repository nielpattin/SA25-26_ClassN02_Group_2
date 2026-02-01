import { GanttHeader } from './GanttHeader'
import type { TaskWithLabels } from '../../hooks/useTasks'
import type { ViewMode } from '../../hooks/useCalendarNavigation'

type GanttViewProps = {
  boardId: string
  tasks: TaskWithLabels[]
  columns: { id: string; name: string }[]
  onTaskClick: (id: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  isFiltering?: boolean
}

export function GanttView({
  tasks,
  onTaskClick,
  viewMode,
  onViewModeChange,
  isFiltering = false,
}: GanttViewProps) {
  const scheduledTasks = tasks.filter(t => t.startDate || t.dueDate)
  const unscheduledTasks = tasks.filter(t => !t.startDate && !t.dueDate)

  return (
    <div className="bg-canvas flex flex-1 flex-col overflow-hidden">
      <GanttHeader
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      <div className="flex-1 overflow-hidden border-b-2 border-black">
        {scheduledTasks.length > 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-4xl">📊</div>
              <div className="text-sm font-bold text-black/60 uppercase">
                Gantt View Coming Soon
              </div>
              <div className="mt-2 text-xs text-black/40">
                {scheduledTasks.length} scheduled task{scheduledTasks.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-bold text-black/40 uppercase">
            No scheduled tasks to display
          </div>
        )}
      </div>

      {/* Unscheduled Section */}
      <div className="flex h-28 shrink-0 bg-white">
        <div className="bg-canvas scrollbar-hide flex flex-1 items-center gap-4 overflow-x-auto p-4">
          {unscheduledTasks.length === 0 ? (
            <div className="text-xs font-medium text-black/40 italic">
              {isFiltering ? 'No unscheduled tasks match your filters' : 'All tasks have dates'}
            </div>
          ) : (
            unscheduledTasks.map(task => (
              <div
                key={task.id}
                className="shadow-brutal-sm flex h-16 w-48 shrink-0 cursor-pointer items-center justify-center border-2 border-black bg-white p-2 text-center text-xs font-bold transition-transform hover:-translate-y-1"
                onClick={() => onTaskClick(task.id)}
              >
                {task.title}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
