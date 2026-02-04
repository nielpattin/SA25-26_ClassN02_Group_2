import { memo, useCallback } from 'react'
import { CheckSquare } from 'lucide-react'

export type TaskLabel = {
  id: string
  name: string
  color: string
}

export type ChecklistProgress = {
  completed: number
  total: number
}

export type TaskCardData = {
  id: string
  title: string
  position: string
  columnId: string
  startDate: string | Date | null
  dueDate: string | Date | null
  description?: string | null
  createdAt?: Date | null
  labels?: TaskLabel[]
  checklistProgress?: ChecklistProgress | null
  attachmentsCount?: number
  size?: 'xs' | 's' | 'm' | 'l' | 'xl' | null
}

export type TaskCardProps = {
  task: TaskCardData
  onTaskClick: (id: string) => void
  onTaskDragStart?: (task: TaskCardData, e: React.MouseEvent) => void
  isDragging?: boolean
  isAnyDragging: boolean
}

export const TaskCard = memo(function TaskCard({
  task,
  onTaskClick,
  onTaskDragStart,
  isDragging = false,
  isAnyDragging,
}: TaskCardProps) {
  const now = new Date()
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const isOverdue = task.dueDate && new Date(task.dueDate) < now
  const isDueSoon = task.dueDate && !isOverdue && new Date(task.dueDate) <= twoDaysFromNow

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      onTaskDragStart?.(task, e)
    },
    [task, onTaskDragStart]
  )

  const handleClick = useCallback(() => {
    onTaskClick(task.id)
  }, [task, onTaskClick])

  return (
    <div
      className={`card-wrapper ${isDragging ? 'relative rounded-none border border-dashed border-black bg-black/5 shadow-none! transition-none!' : ''}`}
      onMouseDown={handleMouseDown}
      data-card-id={task.id}
      data-column-id={task.columnId}
      data-role="card-wrapper"
      data-state={isDragging ? 'placeholder' : undefined}
    >
      <div
        className={`bg-surface shadow-brutal-sm flex cursor-pointer flex-col gap-2 border border-black p-3 text-[14px] transition-[transform,box-shadow,background-color] duration-200 ${isDragging ? 'invisible! transition-none!' : 'hover:bg-accent hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5'} ${isAnyDragging ? 'pointer-events-none' : ''}`}
        onClick={handleClick}
        data-role="card"
      >
        {task.labels && task.labels.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {task.labels.map((l: TaskLabel) => (
              <div
                key={l.id}
                className="h-2 w-10 origin-top rounded-none border border-black shadow-[1px_1px_0px_rgba(0,0,0,0.5)] transition-transform hover:scale-y-150"
                style={{ background: l.color }}
              />
            ))}
          </div>
        )}
        <div className="leading-tight font-bold text-black">{task.title}</div>
        {(task.checklistProgress || task.dueDate || task.size) && (
          <div className="flex items-center gap-3 text-[11px] font-bold text-black uppercase">
            {task.checklistProgress && (
              <span className="flex items-center gap-1">
                <CheckSquare size={12} />
                {task.checklistProgress.completed}/{task.checklistProgress.total}
              </span>
            )}
            {task.dueDate && (
              <span
                className={`border border-black px-1.5 py-0.5 ${isOverdue ? 'bg-[#E74C3C] text-white' : isDueSoon ? 'bg-accent text-black' : 'border-transparent bg-white text-black'}`}
              >
                {new Date(task.dueDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
            {task.size && (
              <span className="border border-black bg-white px-1.5 py-0.5 text-black">
                {task.size.toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

TaskCard.displayName = 'TaskCard'
