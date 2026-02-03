import { differenceInCalendarDays, startOfDay } from 'date-fns'
import type { TaskWithLabels } from '../../hooks/useTasks'

type GanttTaskBarProps = {
  task: TaskWithLabels
  timelineStart: Date
  columnWidth: number
  rowHeight: number
  onClick?: (taskId: string) => void
}

export function GanttTaskBar({
  task,
  timelineStart,
  columnWidth,
  onClick
}: GanttTaskBarProps) {
  if (!task.startDate || !task.dueDate) return null

  const start = startOfDay(new Date(task.startDate))
  const end = startOfDay(new Date(task.dueDate))
  
  const offsetDays = differenceInCalendarDays(start, timelineStart)
  const durationDays = differenceInCalendarDays(end, start) + 1
  
  const left = offsetDays * columnWidth
  const width = Math.max(durationDays * columnWidth, 80)
  
  const progress = task.checklistProgress 
    ? (task.checklistProgress.completed / task.checklistProgress.total) * 100 
    : 0

  const statusColor = task.labels?.[0]?.color || 'var(--color-accent)'

  return (
    <div
      data-role="task-bar"
      onClick={() => onClick?.(task.id)}
      className="absolute z-10 flex h-8 cursor-pointer items-center"
      style={{
        left,
        width,
        top: 8, // Center in 48px row
      }}
    >
      <div className="shadow-brutal-sm relative flex h-full w-full items-center gap-2 border border-black bg-white px-2">
        {/* Status Badge */}
        <div 
          className="size-2 shrink-0 rounded-full border border-black" 
          style={{ backgroundColor: statusColor }}
        />
        
        <span className="flex-1 truncate text-xs font-bold tracking-tight uppercase">
          {task.title}
        </span>

        {task.checklistProgress && (
          <div className="relative flex size-5 shrink-0 items-center justify-center">
            <svg className="size-full -rotate-90">
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="2"
                className="text-black/10"
              />
              <circle
                cx="10"
                cy="10"
                r="8"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={2 * Math.PI * 8}
                strokeDashoffset={2 * Math.PI * 8 * (1 - progress / 100)}
                className="text-black"
              />
            </svg>
            <span className="absolute text-[8px] font-bold">
              {Math.round(progress)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
