import { useRef, useEffect } from 'react'
import { format, isSameDay, isWeekend, differenceInDays, startOfDay } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { GanttTaskBar } from './GanttTaskBar'
import { GanttDependencyLines } from './GanttDependencyLines'
import type { TaskWithLabels } from '../../hooks/useTasks'
import type { TaskDependency } from '../../hooks/useDependencies'

type GanttTimelineProps = {
  tasks: TaskWithLabels[]
  dependencies?: TaskDependency[]
  range: {
    start: Date
    end: Date
    days: Date[]
    months: {
      start: Date
      end: Date
      days: Date[]
    }[]
    totalDays: number
  }
  onScroll?: (scrollLeft: number, scrollTop?: number) => void
  scrollLeft?: number
  scrollTop?: number
  onTaskClick?: (taskId: string) => void
}

const COLUMN_WIDTH = 40
const ROW_HEIGHT = 48

export function GanttTimeline({ range, tasks, dependencies = [], onScroll, scrollLeft, scrollTop, onTaskClick }: GanttTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const today = new Date()

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  useEffect(() => {
    if (containerRef.current) {
      if (scrollLeft !== undefined) containerRef.current.scrollLeft = scrollLeft
      if (scrollTop !== undefined) containerRef.current.scrollTop = scrollTop
    }
  }, [scrollLeft, scrollTop])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(e.currentTarget.scrollLeft, e.currentTarget.scrollTop)
  }

  return (
    <div
      ref={containerRef}
      className="gantt-timeline-content relative flex-1 overflow-auto border-l border-black bg-white"
      onScroll={handleScroll}
    >
      <div 
        style={{ width: range.totalDays * COLUMN_WIDTH }}
        className="relative"
      >
        {/* Today Marker Line */}
        {range.days.some(d => isSameDay(d, today)) && (
          <div
            className="pointer-events-none absolute bottom-0 z-30 w-px bg-red-500"
            style={{
              left: differenceInDays(startOfDay(today), range.start) * COLUMN_WIDTH + COLUMN_WIDTH / 2,
              top: 40, // Below month header
            }}
          />
        )}

        {/* Headers */}
        <div className="sticky top-0 z-20 bg-white">
          {/* Month Header */}
          <div className="flex border-b border-black">
            {range.months.map((month, i) => (
              <div
                key={i}
                style={{ width: month.days.length * COLUMN_WIDTH }}
                className="flex h-10 items-center border-r border-black px-3 text-xs font-bold tracking-wider text-black uppercase"
              >
                <div className="flex flex-1 items-center justify-between">
                  <span>{format(month.start, 'MMMM yyyy')}</span>
                  {month.days.some(d => isSameDay(d, today)) && (
                    <span className="bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
                      Today
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Day Header */}
          <div className="flex border-b border-black">
            {range.days.map((day, i) => {
              const weekend = isWeekend(day)
              const today_ = isSameDay(day, today)
              return (
                <div
                  key={i}
                  style={{ width: COLUMN_WIDTH }}
                  className={`flex h-10 flex-col items-center justify-center border-r border-black text-[10px] font-bold ${
                    weekend ? 'bg-black/5' : ''
                  } ${today_ ? 'bg-accent/20' : ''}`}
                >
                  <span className="opacity-50">{format(day, 'EEE')}</span>
                  <span>{format(day, 'd')}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Grid Background */}
        <div className="pointer-events-none absolute inset-0 top-[80px] z-0 flex">
          {range.days.map((day, i) => (
            <div
              key={i}
              style={{ width: COLUMN_WIDTH }}
              className={`h-full border-r border-black/10 ${
                isWeekend(day) ? 'bg-black/2' : ''
              }`}
            />
          ))}
        </div>

        {/* Content Area */}
        <div className="relative z-10" style={{ height: virtualizer.getTotalSize() }}>
          <GanttDependencyLines
            tasks={tasks}
            dependencies={dependencies}
            timelineStart={range.start}
            columnWidth={COLUMN_WIDTH}
            rowHeight={ROW_HEIGHT}
          />
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const task = tasks[virtualRow.index]
            return (
              <div 
                key={virtualRow.key} 
                className="absolute top-0 left-0 w-full border-b border-black/5" 
                style={{ 
                  height: virtualRow.size,
                  transform: `translateY(${virtualRow.start}px)`
                }}
              >
                <GanttTaskBar
                  task={task}
                  timelineStart={range.start}
                  columnWidth={COLUMN_WIDTH}
                  rowHeight={ROW_HEIGHT}
                  onClick={onTaskClick}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
