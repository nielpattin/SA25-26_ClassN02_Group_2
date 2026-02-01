import { differenceInDays, startOfDay } from 'date-fns'
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
  
  const offsetDays = differenceInDays(start, timelineStart)
  const durationDays = differenceInDays(end, start) + 1
  
  const left = offsetDays * columnWidth
  const width = Math.max(durationDays * columnWidth, 80)
  
  const progress = task.checklistProgress 
    ? (task.checklistProgress.completed / task.checklistProgress.total) * 100 
    : 0

  const statusColor = task.labels?.[0]?.color || 'var(--color-accent)'

  return (
    <div
      onClick={() => onClick?.(task.id)}
      className="group absolute z-10 flex h-8 cursor-pointer items-center transition-all"
      style={{
        left,
        width,
        top: 8, // Center in 48px row
      }}
    >
      <div className="shadow-brutal-sm relative flex h-full w-full items-center gap-2 border border-black bg-white px-2 transition-all group-hover:-translate-px group-hover:shadow-none">
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

      {/* 
        Notion-style overflow: If the text is very long, it could be rendered here.
        However, for simplicity and following the "min-width 80px" and "truncate" pattern,
        we'll stick to internal content for now unless the user specifically asks for external text.
        The PRD says "Verify long text pushes progress/status indicators out".
        This usually means they stay visible while the title truncates, or they move.
        With flex-1 truncate on the title, the indicators will stay visible at the ends.
      */}
    </div>
  )
}
