import { differenceInDays, startOfDay } from 'date-fns'
import { useState, useEffect, useCallback } from 'react'
import { GanttTimeline } from './GanttTimeline'
import { GanttTaskList } from './GanttTaskList'
import { useGanttRange } from '../../hooks/useGanttRange'
import { useDependencies } from '../../hooks/useDependencies'
import type { TaskWithLabels } from '../../hooks/useTasks'

type GanttContainerProps = {
  tasks: TaskWithLabels[]
  boardId: string
  onTaskClick?: (id: string) => void
  todayTrigger?: number
}

export function GanttContainer({ tasks, boardId, onTaskClick, todayTrigger }: GanttContainerProps) {
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('kyte-gantt-sidebar-collapsed')
    return saved === 'true'
  })

  const range = useGanttRange(tasks)
  const { data: dependencies = [] } = useDependencies(boardId)

  // Sort tasks: dated tasks first (by startDate), then unscheduled tasks (by title)
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

  const handleTimelineScroll = (left: number, top?: number) => {
    setScrollLeft(left)
    if (top !== undefined) setScrollTop(top)
  }

  const handleListScroll = (top: number) => {
    setScrollTop(top)
  }

  const handleToday = useCallback(() => {
    const today = new Date()
    const offsetDays = differenceInDays(startOfDay(today), range.start)
    const timelineElement = document.querySelector('.gantt-timeline-content')
    if (timelineElement) {
      const containerWidth = timelineElement.clientWidth
      const targetScroll = offsetDays * 40 - containerWidth / 2 + 20
      setScrollLeft(targetScroll)
    }
  }, [range.start])

  useEffect(() => {
    if (todayTrigger && todayTrigger > 0) {
      setTimeout(handleToday, 0)
    }
  }, [todayTrigger, handleToday])

  // Effect to persist sidebar state
  useEffect(() => {
    localStorage.setItem('kyte-gantt-sidebar-collapsed', String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  return (
    <div className="flex flex-1 overflow-hidden bg-white">
      <GanttTaskList 
        tasks={sortedTasks} 
        onScroll={handleListScroll} 
        scrollTop={scrollTop}
        isCollapsed={isSidebarCollapsed}
        onTaskClick={onTaskClick}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <GanttTimeline 
          tasks={sortedTasks} 
          dependencies={dependencies}
          range={range}
          onScroll={handleTimelineScroll}
          scrollLeft={scrollLeft}
          scrollTop={scrollTop}
          onTaskClick={onTaskClick}
        />
      </div>
      
      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="shadow-brutal-sm absolute bottom-4 left-4 z-30 flex size-8 items-center justify-center border border-black bg-white transition-all hover:-translate-px hover:shadow-none"
      >
        {isSidebarCollapsed ? '→' : '←'}
      </button>
    </div>
  )
}
