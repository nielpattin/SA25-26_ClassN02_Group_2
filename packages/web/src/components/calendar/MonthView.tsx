import { useMemo, useState, useRef, useEffect } from 'react'
import {
  format,
  startOfMonth,
  startOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addDays,
  isSameDay,
} from 'date-fns'
import { type TaskWithLabels } from '../../hooks/useTasks'
import { CalendarCard } from './CalendarCard'
import { X } from 'lucide-react'

type MonthViewProps = {
  currentDate: Date
  tasks: TaskWithLabels[]
  columns: { id: string; name: string }[]
  onTaskClick: (id: string) => void
  onTaskDragStart: (task: TaskWithLabels, e: React.MouseEvent) => void
  onAddTask: (columnId: string, title: string, dueDate?: string) => void
}

export function MonthView({ currentDate, tasks, columns, onTaskClick, onTaskDragStart, onAddTask }: MonthViewProps) {
  const [expandedDate, setExpandedDate] = useState<Date | null>(null)
  const [creatingDate, setCreatingDate] = useState<Date | null>(null)
  const [quickCreateTitle, setQuickCreateTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creatingDate && inputRef.current) {
      inputRef.current.focus()
    }
  }, [creatingDate])

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart)
    
    const allDays = eachDayOfInterval({
      start: calendarStart,
      end: addDays(calendarStart, 41),
    })
    
    return allDays
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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="flex h-full flex-col border border-black bg-white shadow-brutal-lg">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-black bg-accent/10">
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-xs font-black text-black uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 overflow-hidden bg-black">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDay[dateKey] || []
          const isCurrentMonth = isSameMonth(day, currentDate)
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
              className={`relative flex flex-col gap-1 overflow-hidden border-r border-b border-black p-1 transition-colors ${
                isCurrentMonth ? 'bg-white' : 'bg-canvas text-black/30'
              } ${isCurrentToday ? 'ring-2 ring-accent ring-inset' : ''} ${creatingDate && isSameDay(creatingDate, day) ? 'bg-accent/5' : ''}`}
            >
              <div className={`text-right text-xs font-bold ${isCurrentToday ? 'text-accent-foreground' : ''}`}>
                {format(day, 'd')}
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                {dayTasks.slice(0, 3).map(task => (
                  <CalendarCard key={task.id} task={task} onClick={onTaskClick} onDragStart={onTaskDragStart} variant="compact" />
                ))}
                {dayTasks.length > 3 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedDate(day)
                    }}
                    className="mt-auto cursor-pointer text-left text-[10px] font-black uppercase underline transition-colors hover:bg-accent"
                  >
                    + {dayTasks.length - 3} more
                  </button>
                )}
                {creatingDate && isSameDay(creatingDate, day) && (
                  <div className="mt-1" onClick={e => e.stopPropagation()}>
                    <input
                      ref={inputRef}
                      type="text"
                      className="w-full border border-black bg-white p-1 text-[10px] font-bold shadow-brutal-sm outline-none"
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

      {/* Expanded Day Overlay */}
      {expandedDate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setExpandedDate(null)}
        >
          <div 
            className="flex max-h-[80vh] w-full max-w-md flex-col border-2 border-black bg-white shadow-brutal-lg"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black bg-accent p-4">
              <h3 className="font-heading text-lg font-black uppercase">
                {format(expandedDate, 'MMMM d, yyyy')}
              </h3>
              <button 
                onClick={() => setExpandedDate(null)}
                className="h-8 w-8 rounded-none border border-black bg-white/10 p-1 transition-colors hover:bg-white/20"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-col gap-2">
                {tasksByDay[format(expandedDate, 'yyyy-MM-dd')]?.map(task => (
                  <CalendarCard key={task.id} task={task} onClick={onTaskClick} onDragStart={onTaskDragStart} variant="normal" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
