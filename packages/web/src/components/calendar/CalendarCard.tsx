import { memo, useCallback } from 'react'
import { type TaskWithLabels } from '../../hooks/useTasks'
import { isBefore, addDays, startOfDay } from 'date-fns'

type CardVariant = 'compact' | 'normal' | 'large'

type CalendarCardProps = {
  task: TaskWithLabels
  onClick: (id: string) => void
  onDragStart?: (task: TaskWithLabels, e: React.MouseEvent) => void
  variant?: CardVariant
}

const variantStyles: Record<CardVariant, { card: string; label: string }> = {
  compact: {
    card: 'p-1 text-[10px] gap-1 mb-1',
    label: 'h-1 w-4',
  },
  normal: {
    card: 'p-2 text-xs gap-1.5 mb-1.5',
    label: 'h-1.5 w-6',
  },
  large: {
    card: 'p-3 text-sm gap-2 mb-2',
    label: 'h-2 w-8',
  },
}

export const CalendarCard = memo(function CalendarCard({ task, onClick, onDragStart, variant = 'compact' }: CalendarCardProps) {
  const now = startOfDay(new Date())
  const twoDaysFromNow = addDays(now, 2)
  const dueDate = task.dueDate ? startOfDay(new Date(task.dueDate)) : null
  
  const isOverdue = dueDate && isBefore(dueDate, now)
  const isDueSoon = dueDate && !isOverdue && (isBefore(dueDate, twoDaysFromNow) || dueDate.getTime() === twoDaysFromNow.getTime())

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onDragStart?.(task, e)
  }, [task, onDragStart])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(task.id)
  }, [task.id, onClick])

  const styles = variantStyles[variant]

  return (
    <div
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      className={`group shadow-brutal-sm flex cursor-pointer flex-col border border-black transition-all hover:translate-px hover:shadow-none ${styles.card} ${
        isOverdue ? 'bg-[#E74C3C] text-white' : isDueSoon ? 'bg-accent text-black' : 'bg-white text-black'
      }`}
    >
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-0.5">
          {task.labels.map(label => (
            <div
              key={label.id}
              className={`border border-black/20 ${styles.label}`}
              style={{ backgroundColor: label.color }}
            />
          ))}
        </div>
      )}
      <div className="truncate leading-tight font-bold">{task.title}</div>
    </div>
  )
})

CalendarCard.displayName = 'CalendarCard'
