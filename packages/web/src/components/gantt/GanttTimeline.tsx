import { useRef, useEffect, useMemo, useState } from 'react'
import { format, isSameDay, isWeekend, differenceInCalendarDays, startOfDay, getWeek, getQuarter } from 'date-fns'
import { useVirtualizer } from '@tanstack/react-virtual'
import { GanttTaskBar } from './GanttTaskBar'
import { GanttDependencyLines } from './GanttDependencyLines'
import type { TaskWithLabels } from '../../hooks/useTasks'
import type { TaskDependency } from '../../hooks/useDependencies'
import type { ZoomMode } from '../../hooks/useBoardPreferences'

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
  zoomMode: ZoomMode
  columnWidth: number
  scrollRef?: React.RefObject<HTMLDivElement | null>
  visibleStartIndex?: number
  visibleEndIndex?: number
}

const ROW_HEIGHT = 48
const HEADER_ROW_HEIGHT = 40
const MARKER_ROW_HEIGHT = 20

export function GanttTimeline({
  range,
  tasks,
  dependencies = [],
  onScroll,
  scrollLeft,
  scrollTop,
  onTaskClick,
  zoomMode,
  columnWidth,
  scrollRef,
  visibleStartIndex,
  visibleEndIndex,
}: GanttTimelineProps) {
  const internalRef = useRef<HTMLDivElement>(null)
  const containerRef = scrollRef ?? internalRef
  const syncingScrollRef = useRef(false)
  const today = startOfDay(new Date())

  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef({ x: 0, scrollLeft: 0 })
  const hasDragged = useRef(false)

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  })

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const needsLeft = scrollLeft !== undefined && element.scrollLeft !== scrollLeft
    const needsTop = scrollTop !== undefined && element.scrollTop !== scrollTop
    if (!needsLeft && !needsTop) return
    syncingScrollRef.current = true
    if (scrollLeft !== undefined) element.scrollLeft = scrollLeft
    if (scrollTop !== undefined) element.scrollTop = scrollTop
    requestAnimationFrame(() => {
      syncingScrollRef.current = false
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollLeft, scrollTop])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (syncingScrollRef.current) return
    onScroll?.(e.currentTarget.scrollLeft, e.currentTarget.scrollTop)
  }

  const dragDistanceRef = useRef(0)
  const DRAG_THRESHOLD = 5

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return

    setIsDragging(true)
    dragDistanceRef.current = 0
    hasDragged.current = false
    dragStartPos.current = {
      x: e.clientX,
      scrollLeft: containerRef.current?.scrollLeft ?? 0,
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    
    const deltaX = dragStartPos.current.x - e.clientX
    dragDistanceRef.current = Math.abs(deltaX)
    
    if (dragDistanceRef.current > DRAG_THRESHOLD) {
      hasDragged.current = true
    }
    
    const element = containerRef.current
    if (!element) return
    
    element.scrollLeft = dragStartPos.current.scrollLeft + deltaX
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      hasDragged.current = false
      dragDistanceRef.current = 0
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDragged.current) {
      e.preventDefault()
      e.stopPropagation()
    }
    hasDragged.current = false
    dragDistanceRef.current = 0
  }

  const todayIndex = range.days.findIndex(d => isSameDay(d, today))
  const headerOffset = MARKER_ROW_HEIGHT + HEADER_ROW_HEIGHT
  const gridOffset = MARKER_ROW_HEIGHT + HEADER_ROW_HEIGHT * 2

  const taskRanges = useMemo(() => {
    return tasks
      .filter(task => task.startDate && task.dueDate)
      .map(task => ({
        start: startOfDay(new Date(task.startDate!)),
        end: startOfDay(new Date(task.dueDate!)),
      }))
  }, [tasks])

  const monthHasTasks = (monthStart: Date, monthEnd: Date) => {
    const start = monthStart.getTime()
    const end = monthEnd.getTime()
    return taskRanges.some(range => range.start.getTime() <= end && range.end.getTime() >= start)
  }

  const monthInView = (monthDays: Date[]) => {
    if (visibleStartIndex === undefined || visibleEndIndex === undefined) return true
    const firstDay = monthDays[0]
    const lastDay = monthDays[monthDays.length - 1]
    const startIndex = differenceInCalendarDays(firstDay, range.start)
    const endIndex = differenceInCalendarDays(lastDay, range.start)
    return endIndex >= visibleStartIndex && startIndex <= visibleEndIndex
  }

  const getMonthLabel = (monthStart: Date, dayCount: number) => {
    const width = dayCount * columnWidth
    if (zoomMode === 'quarter') {
      if (width < 70) return `Q${getQuarter(monthStart)}`
      if (width < 120) return `Q${getQuarter(monthStart)} ${format(monthStart, 'yy')}`
      return `Q${getQuarter(monthStart)} ${format(monthStart, 'yyyy')}`
    }
    if (width < 70) return format(monthStart, 'MMM')
    if (width < 120) return format(monthStart, 'MMM yyyy')
    return format(monthStart, 'MMMM yyyy')
  }

  return (
    <div
      ref={containerRef}
      className={`gantt-timeline-content relative flex-1 overflow-auto border-l border-black bg-white select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onScroll={handleScroll}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div 
        style={{ width: range.totalDays * columnWidth }}
        className="relative"
      >
        {/* Today Marker Line */}
        {todayIndex !== -1 && (
          <div
            className="pointer-events-none absolute bottom-0 z-30 w-px bg-red-500"
            style={{
              left: todayIndex * columnWidth + columnWidth / 2,
              top: headerOffset,
            }}
          />
        )}

        {/* Headers */}
        <div className="sticky top-0 z-20 bg-white">
          <div className="relative flex h-5 items-center border-b border-black">
            {todayIndex !== -1 && (
              <div
                className="pointer-events-none absolute top-1/2 z-30 -translate-x-1/2 -translate-y-1/2"
                style={{ left: todayIndex * columnWidth + columnWidth / 2 }}
              >
                <span className="bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                  Today
                </span>
              </div>
            )}
          </div>
          {/* Month/Quarter Header */}
          <div className="flex border-b border-black">
            {range.months.map((month, i) => {
              const hasTasks = monthHasTasks(month.start, month.end)
              const inView = monthInView(month.days)
              const showLabel = hasTasks || inView
              return (
                <div
                  key={i}
                  style={{ width: month.days.length * columnWidth }}
                  className={`flex h-10 items-center overflow-hidden border-r ${
                    showLabel
                      ? 'border-black px-3 text-xs font-bold tracking-wider text-black uppercase'
                      : 'border-transparent px-0'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center">
                    {showLabel && (
                      <span className="block max-w-full truncate">
                        {getMonthLabel(month.start, month.days.length)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Day/Week Header */}
          <div className="flex border-b border-black">
            {zoomMode === 'day' || zoomMode === 'week' ? (
              range.days.map((day, i) => {
                const weekend = isWeekend(day)
                const today_ = isSameDay(day, today)
                return (
                  <div
                    key={i}
                    style={{ width: columnWidth }}
                    className={`flex h-10 flex-col items-center justify-center border-r border-black text-[10px] font-bold ${
                      weekend ? 'bg-black/5' : ''
                    } ${today_ ? 'bg-accent/20' : ''}`}
                  >
                    {columnWidth >= 24 && <span className="opacity-50">{format(day, 'EEE')}</span>}
                    <span>{format(day, 'd')}</span>
                  </div>
                )
              })
            ) : (
              range.days.filter((_, i) => i % 7 === 0).map((day, i) => {
                const weekNum = getWeek(day)
                const hasToday = range.days.slice(i * 7, i * 7 + 7).some(d => isSameDay(d, today))
                return (
                  <div
                    key={i}
                    style={{ width: 7 * columnWidth }}
                    className={`flex h-10 items-center justify-center border-r border-black text-[10px] font-bold ${
                      hasToday ? 'bg-accent/20' : ''
                    }`}
                  >
                    W{weekNum}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Grid Background */}
        <div className="pointer-events-none absolute inset-0 z-0 flex" style={{ top: gridOffset }}>
          {range.days.map((day, i) => (
            <div
              key={i}
              style={{ width: columnWidth }}
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
            columnWidth={columnWidth}
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
                  columnWidth={columnWidth}
                  rowHeight={ROW_HEIGHT}
                  onClick={(id) => {
                    if (hasDragged.current) return
                    onTaskClick?.(id)
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
