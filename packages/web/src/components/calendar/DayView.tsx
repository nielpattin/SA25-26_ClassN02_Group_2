import { useMemo, useState, useRef, useEffect } from 'react'
import {
  format,
  isToday,
} from 'date-fns'
import { type TaskWithLabels } from '../../hooks/useTasks'
import { CalendarCard } from './CalendarCard'

type DayViewProps = {
  currentDate: Date
  tasks: TaskWithLabels[]
  columns: { id: string; name: string }[]
  onTaskClick: (id: string) => void
  onTaskDragStart: (task: TaskWithLabels, e: React.MouseEvent) => void
  onAddTask: (columnId: string, title: string, dueDate?: string) => void
}

export function DayView({ currentDate, tasks, columns, onTaskClick, onTaskDragStart, onAddTask }: DayViewProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [quickCreateTitle, setQuickCreateTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCreating])

  const dayTasks = useMemo(() => {
    const dateKey = format(currentDate, 'yyyy-MM-dd')
    return tasks.filter(task => {
      if (!task.dueDate) return false
      return format(new Date(task.dueDate), 'yyyy-MM-dd') === dateKey
    })
  }, [currentDate, tasks])

  const isCurrentToday = isToday(currentDate)

  return (
    <div className="flex h-full flex-col border border-black bg-white shadow-brutal-lg">
      <div className={`flex items-center justify-between border-b border-black p-4 ${isCurrentToday ? 'bg-accent' : 'bg-accent/10'}`}>
        <div className="flex flex-col">
          <span className="text-sm font-black text-black/60 uppercase">
            {format(currentDate, 'EEEE')}
          </span>
          <h2 className="text-2xl/tight font-black uppercase">
            {format(currentDate, 'MMMM d, yyyy')}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-black bg-white px-3 py-1 text-sm font-black uppercase shadow-brutal-sm">
            {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
          </span>
          <button
            onClick={() => setIsCreating(true)}
            className="border border-black bg-white px-3 py-1 text-sm font-black uppercase shadow-brutal-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:bg-accent hover:shadow-none"
          >
            + Add Task
          </button>
        </div>
      </div>

      <div 
        className="flex-1 overflow-y-auto bg-canvas/50 p-6"
        onClick={() => {
          if (columns.length > 0) {
            setIsCreating(true)
          }
        }}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {dayTasks.length === 0 && !isCreating ? (
            <div
              data-role="day-cell"
              data-date={format(currentDate, 'yyyy-MM-dd')}
              className="flex flex-col items-center justify-center border-2 border-dashed border-black/20 bg-white py-12 text-center shadow-brutal-sm"
            >
              <span className="text-lg font-black text-black/20 uppercase">No tasks for this day</span>
            </div>
          ) : (
            <div
              className="flex flex-col gap-3"
              data-role="day-cell"
              data-date={format(currentDate, 'yyyy-MM-dd')}
            >
              {dayTasks.map(task => (
                <CalendarCard key={task.id} task={task} onClick={onTaskClick} onDragStart={onTaskDragStart} variant="large" />
              ))}
              
              {isCreating && (
                <div className="mt-1" onClick={e => e.stopPropagation()}>
                  <input
                    ref={inputRef}
                    type="text"
                    className="w-full border-2 border-black bg-white p-3 text-sm font-bold shadow-brutal-md outline-none"
                    placeholder="Task title..."
                    value={quickCreateTitle}
                    onChange={e => setQuickCreateTitle(e.target.value)}
                    onBlur={() => {
                      if (!quickCreateTitle) {
                        setIsCreating(false)
                      }
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && quickCreateTitle.trim() && columns.length > 0) {
                        onAddTask(columns[0].id, quickCreateTitle.trim(), format(currentDate, 'yyyy-MM-dd'))
                        setQuickCreateTitle('')
                        setIsCreating(false)
                      } else if (e.key === 'Escape') {
                        setIsCreating(false)
                        setQuickCreateTitle('')
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
