import { differenceInCalendarDays, startOfDay } from 'date-fns'
import { useState, useEffect, useCallback, useMemo, useLayoutEffect, useRef } from 'react'
import { GanttTimeline } from './GanttTimeline'
import { GanttTaskList } from './GanttTaskList'
import { useGanttRange } from '../../hooks/useGanttRange'
import { useDependencies } from '../../hooks/useDependencies'
import type { TaskWithLabels } from '../../hooks/useTasks'
import type { ZoomMode } from '../../hooks/useBoardPreferences'

const ZOOM_COLUMN_WIDTHS: Record<ZoomMode, number> = {
  day: 40,
  week: 24,
  month: 12,
  quarter: 6,
}

type GanttContainerProps = {
  tasks: TaskWithLabels[]
  boardId: string
  onTaskClick?: (id: string) => void
  todayTrigger?: number
  zoomMode: ZoomMode
  currentDate?: Date
}

export function GanttContainer({ tasks, boardId, onTaskClick, todayTrigger, zoomMode, currentDate }: GanttContainerProps) {
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [timelineWidth, setTimelineWidth] = useState<number | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const programmaticScrollRef = useRef(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('kyte-gantt-sidebar-collapsed')
    return saved === 'true'
  })

  const range = useGanttRange(tasks, currentDate)
  const { data: dependencies = [] } = useDependencies(boardId)
  const baseColumnWidth = ZOOM_COLUMN_WIDTHS[zoomMode]
  const columnWidth = useMemo(() => {
    if ((zoomMode !== 'quarter' && zoomMode !== 'month') || !timelineWidth) return baseColumnWidth
    const days = Math.max(range.totalDays, 1)
    const fitWidth = Math.ceil(timelineWidth / days)
    return Math.max(baseColumnWidth, fitWidth)
  }, [zoomMode, timelineWidth, range.totalDays, baseColumnWidth])

  useLayoutEffect(() => {
    const element = timelineRef.current
    if (!element) return
    const updateWidth = () => setTimelineWidth(element.clientWidth)
    updateWidth()
    const resizeObserver = new ResizeObserver(() => {
      updateWidth()
    })
    resizeObserver.observe(element)
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.startDate && b.startDate) {
      const dateA = new Date(a.startDate).getTime()
      const dateB = new Date(b.startDate).getTime()
      if (dateA !== dateB) return dateA - dateB
      return a.title.localeCompare(b.title)
    }
    if (a.startDate) return -1
    if (b.startDate) return 1
    return a.title.localeCompare(b.title)
  })

  const handleListScroll = (top: number) => {
    setScrollTop(top)
  }

  const visibleStartIndex = Math.max(0, Math.floor(scrollLeft / columnWidth))
  const visibleEndIndex = Math.min(
    range.totalDays - 1,
    Math.ceil((scrollLeft + (timelineWidth ?? 0)) / columnWidth)
  )

  const rangeStart = range.start.getTime()
  const handleTimelineScroll = (left: number, top?: number) => {
    setScrollLeft(left)
    if (top !== undefined) setScrollTop(top)
  }

  const scrollToDate = useCallback((date: Date) => {
    const offsetDays = differenceInCalendarDays(startOfDay(date), new Date(rangeStart))
    const timelineElement = timelineRef.current
    if (!timelineElement) return
    const containerWidth = timelineElement.clientWidth
    if (containerWidth === 0) return
    const rawTarget = offsetDays * columnWidth - containerWidth / 2 + columnWidth / 2
    const maxScroll = Math.max(0, timelineElement.scrollWidth - containerWidth)
    const targetScroll = Math.max(0, Math.min(rawTarget, maxScroll))
    
    if (Math.abs(timelineElement.scrollLeft - targetScroll) < 1) return
    
    programmaticScrollRef.current = true
    setScrollLeft(targetScroll)
    
    setTimeout(() => {
      programmaticScrollRef.current = false
    }, 150)
  }, [rangeStart, columnWidth])

  const handleToday = useCallback(() => {
    scrollToDate(new Date())
  }, [scrollToDate])

  // Handle today trigger from header
  useEffect(() => {
    if (todayTrigger && todayTrigger > 0) {
      setTimeout(handleToday, 0)
    }
  }, [todayTrigger, handleToday])

  // Scroll to currentDate when it changes (from header navigation)
  const lastScrollKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (currentDate) {
      const key = `${startOfDay(currentDate).getTime()}-${rangeStart}-${columnWidth}`
      if (lastScrollKeyRef.current === key) return
      lastScrollKeyRef.current = key
      scrollToDate(currentDate)
    }
  }, [currentDate, scrollToDate, rangeStart, columnWidth])

  // Effect to persist sidebar state
  useEffect(() => {
    localStorage.setItem('kyte-gantt-sidebar-collapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-white">
      <GanttTaskList 
        tasks={sortedTasks} 
        onScroll={handleListScroll} 
        scrollTop={scrollTop}
        isCollapsed={isSidebarCollapsed}
        onTaskClick={onTaskClick}
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <GanttTimeline 
          tasks={sortedTasks} 
          dependencies={dependencies}
          range={range}
          onScroll={handleTimelineScroll}
          scrollLeft={scrollLeft}
          scrollTop={scrollTop}
          onTaskClick={onTaskClick}
          zoomMode={zoomMode}
          columnWidth={columnWidth}
          scrollRef={timelineRef}
          visibleStartIndex={visibleStartIndex}
          visibleEndIndex={visibleEndIndex}
        />
      </div>
      
      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="absolute bottom-4 left-4 z-30 flex size-8 items-center justify-center border border-black bg-white shadow-brutal-sm transition-all hover:-translate-px hover:shadow-none"
      >
        {isSidebarCollapsed ? '→' : '←'}
      </button>
    </div>
  )
}
