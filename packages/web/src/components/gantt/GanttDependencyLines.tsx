import { differenceInCalendarDays, startOfDay } from 'date-fns'
import type { TaskWithLabels } from '../../hooks/useTasks'
import type { TaskDependency } from '../../hooks/useDependencies'

type GanttDependencyLinesProps = {
  tasks: TaskWithLabels[]
  dependencies: TaskDependency[]
  timelineStart: Date
  columnWidth: number
  rowHeight: number
}

export function GanttDependencyLines({
  tasks,
  dependencies,
  timelineStart,
  columnWidth,
  rowHeight,
}: GanttDependencyLinesProps) {
  // Create a map for quick task lookup (index determines row)
  const taskMap = new Map(tasks.map((task, index) => [task.id, { task, index }]))

  const getCoordinates = (taskId: string, point: 'start' | 'end') => {
    const entry = taskMap.get(taskId)
    if (!entry || !entry.task.startDate || !entry.task.dueDate) return null

    const { task, index } = entry
    const start = startOfDay(new Date(task.startDate!))
    const end = startOfDay(new Date(task.dueDate!))
    
    const offsetDays = differenceInCalendarDays(start, timelineStart)
    const durationDays = differenceInCalendarDays(end, start) + 1
    
    const left = offsetDays * columnWidth
    const width = Math.max(durationDays * columnWidth, 80)
    const top = index * rowHeight + 24 // 8px padding + 16px (half of 32px bar)

    return point === 'start' ? { x: left + width, y: top } : { x: left, y: top }
  }

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 overflow-visible"
      style={{ minHeight: tasks.length * rowHeight }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="var(--color-primary)" />
        </marker>
      </defs>
      {dependencies.map((dep) => {
        const startPos = getCoordinates(dep.blockingTaskId, 'start')
        const endPos = getCoordinates(dep.blockedTaskId, 'end')

        if (!startPos || !endPos) return null

        // Simple cubic bezier curve
        // Control points are offset horizontally to create a nice S-curve
        const horizontalOffset = Math.abs(endPos.x - startPos.x) / 2 || 20
        const d = `M ${startPos.x} ${startPos.y} 
                   C ${startPos.x + horizontalOffset} ${startPos.y}, 
                     ${endPos.x - horizontalOffset} ${endPos.y}, 
                     ${endPos.x} ${endPos.y}`

        return (
          <path
            key={dep.id}
            d={d}
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
            className="opacity-60"
          />
        )
      })}
    </svg>
  )
}
