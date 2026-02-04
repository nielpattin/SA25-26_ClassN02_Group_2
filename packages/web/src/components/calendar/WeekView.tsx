import { useMemo, useState, useRef, useEffect } from 'react'
import {
  format,
  startOfWeek,
  eachDayOfInterval,
  isToday,
  addDays,
  isSameDay,
} from 'date-fns'
import { type TaskWithLabels } from '../../hooks/useTasks'
import { CalendarCard } from './CalendarCard'

type WeekViewProps = {
  currentDate: Date
  tasks: TaskWithLabels[]
  columns: { id: string; name: string }[]
  onTaskClick: (id: string) => void
  onTaskDragStart: (task: TaskWithLabels, e: React.MouseEvent) => void
  onAddTask: (columnId: string, title: string, dueDate?: string) => void
}

export function WeekView({ currentDate, tasks, columns, onTaskClick, onTaskDragStart, onAddTask }: WeekViewProps) {
  const [creatingDate, setCreatingDate] = useState<Date | null>(null)
  const [quickCreateTitle, setQuickCreateTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creatingDate && inputRef.current) {
      inputRef.current.focus()
    }
  }, [creatingDate])

  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate)
    return eachDayOfInterval({
      start: weekStart,
      end: addDays(weekStart, 6),
    })
  }, [currentDate])

  const tasksByDay = useMemo(() => {
    const map: Record<string, TaskWithLabels[]> = {}
    tasks.forEach(task => {
      if (!task.dueDate) return
      const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(task)
    })
    return map
  }, [tasks])

  return (
    <div className="flex h-full flex-col border border-black bg-white shadow-brutal-lg">
      <div className="grid flex-1 grid-cols-7 overflow-hidden bg-black">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDay[dateKey] || []
          const isCurrentToday = isToday(day)

          return (
            <div
              key={dateKey}
              data-role="day-cell"
              data-date={dateKey}
              onClick={() => {
                if (columns.length > 0) {
                  setCreatingDate(day)
                }
              }}
              className={`relative flex flex-col gap-2 overflow-hidden border-r border-black bg-white p-2 transition-colors ${
                isCurrentToday ? 'bg-accent/5' : ''
              } ${creatingDate && isSameDay(creatingDate, day) ? 'bg-accent/10' : ''}`}
            >
              <div className={`flex flex-col border-b border-black pb-2 text-center ${isCurrentToday ? '-mx-2 -mt-2 mb-2 bg-accent p-1' : ''}`}>
                <span className="text-[10px] font-black text-black/60 uppercase">
                  {format(day, 'EEE')}
                </span>
                <span className={`text-lg leading-none font-black ${isCurrentToday ? 'text-black' : ''}`}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
                {dayTasks.map(task => (
                  <CalendarCard key={task.id} task={task} onClick={onTaskClick} onDragStart={onTaskDragStart} variant="normal" />
                ))}

                {creatingDate && isSameDay(creatingDate, day) && (
                  <div className="mt-1" onClick={e => e.stopPropagation()}>
                    <input
                      ref={inputRef}
                      type="text"
                      className="w-full border border-black bg-white p-2 text-xs font-bold shadow-brutal-sm outline-none"
                      placeholder="Task title..."
                      value={quickCreateTitle}
                      onChange={e => setQuickCreateTitle(e.target.value)}
                      onBlur={() => {
                        if (!quickCreateTitle) {
                          setCreatingDate(null)
                        }
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && quickCreateTitle.trim() && columns.length > 0) {
                          onAddTask(columns[0].id, quickCreateTitle.trim(), format(day, 'yyyy-MM-dd'))
                          setQuickCreateTitle('')
                          setCreatingDate(null)
                        } else if (e.key === 'Escape') {
                          setCreatingDate(null)
                          setQuickCreateTitle('')
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
