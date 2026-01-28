import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { 
  format, 
  startOfWeek, 
  addDays, 
  addWeeks, 
  addMonths, 
  addQuarters, 
  startOfMonth, 
  startOfYear, 
  eachDayOfInterval, 
  eachWeekOfInterval, 
  eachMonthOfInterval, 
  eachQuarterOfInterval,
  differenceInDays,
  startOfDay,
  isToday,
  isAfter
} from 'date-fns'
import { X } from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useCalendarNavigation, type ViewMode } from '../../hooks/useCalendarNavigation'
import { GanttHeader } from './GanttHeader'
import { type TaskWithLabels, useUpdateTask } from '../../hooks/useTasks'
import { useDragContext } from '../dnd'
import { useCalendarDragHandlers } from '../../hooks/useCalendarDragHandlers'
import { 
  useDependencies, 
  useCreateDependency, 
  useDeleteDependency,
  type TaskDependency 
} from '../../hooks/useDependencies'

type GanttViewProps = {
  boardId: string
  tasks: TaskWithLabels[]
  columns: { id: string; name: string }[]
  onTaskClick: (id: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  isFiltering?: boolean
}

const DAY_WIDTHS: Record<ViewMode, number> = {
  day: 48,
  week: 16,
  month: 6,
  quarter: 2,
}

function wouldBeCircular(
  blockingTaskId: string,
  blockedTaskId: string,
  dependencies: TaskDependency[]
): boolean {
  if (blockingTaskId === blockedTaskId) return true
  
  const graph = new Map<string, string[]>()
  dependencies.forEach(d => {
    const existing = graph.get(d.blockingTaskId) || []
    graph.set(d.blockingTaskId, [...existing, d.blockedTaskId])
  })
  
  const existing = graph.get(blockingTaskId) || []
  graph.set(blockingTaskId, [...existing, blockedTaskId])
  
  const visited = new Set<string>()
  const recStack = new Set<string>()
  
  function hasCycle(node: string): boolean {
    if (recStack.has(node)) return true
    if (visited.has(node)) return false
    
    visited.add(node)
    recStack.add(node)
    
    const neighbors = graph.get(node) || []
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor)) return true
    }
    
    recStack.delete(node)
    return false
  }
  
  return hasCycle(blockingTaskId)
}

export function GanttView({
  boardId,
  tasks,
  columns,
  onTaskClick,
  viewMode,
  onViewModeChange,
  isFiltering = false,
}: GanttViewProps) {
  const { currentDate, next, prev, goToToday, setViewMode } = useCalendarNavigation(viewMode)
  const updateTask = useUpdateTask(boardId)
  const createDependency = useCreateDependency(boardId)
  const deleteDependency = useDeleteDependency(boardId)
  const { draggedCardId } = useDragContext()
  const parentRef = useRef<HTMLDivElement>(null)

  const { data: dependencies = [] } = useDependencies(boardId)

  const [resizing, setResizing] = useState<{
    taskId: string
    side: 'left' | 'right'
  } | null>(null)
  
  const [depDragging, setDepDragging] = useState<{
    sourceTaskId: string
    mousePos: { x: number; y: number }
    isCircular?: boolean
  } | null>(null)

  const [hoveredDepId, setHoveredDepId] = useState<string | null>(null)

  // Persist and restore scroll position
  useEffect(() => {
    const parent = parentRef.current
    if (!parent) return

    const savedScroll = localStorage.getItem(`board:${boardId}:gantt:scroll`)
    if (savedScroll) {
      try {
        const { left, top } = JSON.parse(savedScroll)
        parent.scrollLeft = left
        parent.scrollTop = top
      } catch {
        // Ignore invalid JSON
      }
    }

    const handleScroll = () => {
      const scrollState = {
        left: parent.scrollLeft,
        top: parent.scrollTop
      }
      localStorage.setItem(`board:${boardId}:gantt:scroll`, JSON.stringify(scrollState))
    }

    // Debounce scroll saving
    let timeoutId: ReturnType<typeof setTimeout>
    const debouncedScroll = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(handleScroll, 200)
    }

    parent.addEventListener('scroll', debouncedScroll)
    return () => {
      parent.removeEventListener('scroll', debouncedScroll)
      clearTimeout(timeoutId)
    }
  }, [boardId])

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode)
      onViewModeChange(mode)
    },
    [setViewMode, onViewModeChange]
  )

  const dayWidth = DAY_WIDTHS[viewMode]

  const { timelineStart, units } = useMemo(() => {
    const start = viewMode === 'day' ? startOfWeek(currentDate) :
                  viewMode === 'week' ? startOfMonth(currentDate) :
                  startOfYear(currentDate)
    
    const end = viewMode === 'day' ? addDays(start, 30) :
                viewMode === 'week' ? addWeeks(start, 24) :
                viewMode === 'month' ? addMonths(start, 12) :
                addQuarters(start, 8)

    const interval = { start, end }
    const units = viewMode === 'day' ? eachDayOfInterval(interval) :
                  viewMode === 'week' ? eachWeekOfInterval(interval) :
                  viewMode === 'month' ? eachMonthOfInterval(interval) :
                  eachQuarterOfInterval(interval)

    return { timelineStart: start, units }
  }, [currentDate, viewMode])

  const scheduledTasks = useMemo(() => tasks.filter(t => t.startDate || t.dueDate), [tasks])
  const unscheduledTasks = useMemo(() => tasks.filter(t => !t.startDate && !t.dueDate), [tasks])

  const virtualizer = useVirtualizer({
    count: scheduledTasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalHeight = virtualizer.getTotalSize()

  const handleDrop = useCallback(
    ({ cardId, newDate }: { cardId: string; newDate: string }) => {
      const task = tasks.find(t => t.id === cardId)
      if (task) {
        if (!task.startDate && !task.dueDate) {
          updateTask.mutate({ 
            taskId: cardId, 
            startDate: newDate,
            dueDate: newDate 
          })
        } else {
          const currentStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate!)
          const currentEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate!)
          
          const duration = differenceInDays(currentEnd, currentStart)
          const newStart = new Date(newDate)
          const newEnd = addDays(newStart, duration)

          updateTask.mutate({
            taskId: cardId,
            startDate: format(newStart, 'yyyy-MM-dd'),
            dueDate: format(newEnd, 'yyyy-MM-dd')
          })
        }
      }
    },
    [tasks, updateTask]
  )

  const { handleMouseMove: baseMouseMove, handleMouseUp: baseMouseUp, handleCardDragStart } = useCalendarDragHandlers(handleDrop)

  const handleResizeStart = useCallback((taskId: string, side: 'left' | 'right', e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setResizing({ taskId, side })
  }, [])

  const handleDependencyDragStart = useCallback((taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (parentRef.current) {
      const rect = parentRef.current.getBoundingClientRect()
      const { scrollLeft, scrollTop } = parentRef.current
      setDepDragging({
        sourceTaskId: taskId,
        mousePos: {
          x: e.clientX - rect.left + scrollLeft,
          y: e.clientY - rect.top + scrollTop
        }
      })
    }
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (resizing) {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
      const dayCell = target?.closest('[data-role="day-cell"]') as HTMLElement
      if (dayCell) {
        const newDate = dayCell.dataset.date
        if (newDate) {
          const task = tasks.find(t => t.id === resizing.taskId)
          if (task) {
            const date = new Date(newDate)
            if (resizing.side === 'left') {
              const currentDue = task.dueDate ? new Date(task.dueDate) : date
              if (date <= currentDue) {
                updateTask.mutate({ taskId: task.id, startDate: newDate })
              }
            } else {
              const currentStart = task.startDate ? new Date(task.startDate) : date
              if (date >= currentStart) {
                updateTask.mutate({ taskId: task.id, dueDate: newDate })
              }
            }
          }
        }
      }
    } else if (depDragging) {
      if (parentRef.current) {
        const rect = parentRef.current.getBoundingClientRect()
        const { scrollLeft, scrollTop } = parentRef.current
        const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
        const taskBar = target?.closest('[data-role="task-bar"]') as HTMLElement
        const targetTaskId = taskBar?.dataset.taskId
        
        const isCircular = targetTaskId && targetTaskId !== depDragging.sourceTaskId && 
                          wouldBeCircular(depDragging.sourceTaskId, targetTaskId, dependencies)

        setDepDragging(prev => prev ? {
          ...prev,
          mousePos: {
            x: e.clientX - rect.left + scrollLeft,
            y: e.clientY - rect.top + scrollTop
          },
          isCircular: !!isCircular
        } : null)
      }
    } else {
      baseMouseMove(e)
    }
  }, [resizing, depDragging, tasks, updateTask, baseMouseMove, dependencies])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (resizing) {
      setResizing(null)
    } else if (depDragging) {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
      const taskBar = target?.closest('[data-role="task-bar"]') as HTMLElement
      const targetTaskId = taskBar?.dataset.taskId

      if (targetTaskId && targetTaskId !== depDragging.sourceTaskId) {
        if (!wouldBeCircular(depDragging.sourceTaskId, targetTaskId, dependencies)) {
          createDependency.mutate({
            blockingTaskId: depDragging.sourceTaskId,
            blockedTaskId: targetTaskId,
            type: 'finish_to_start'
          })
        } else {
          console.warn('Circular dependency detected')
        }
      }
      setDepDragging(null)
    } else {
      baseMouseUp(e)
    }
  }, [resizing, depDragging, dependencies, createDependency, baseMouseUp])

  const getTaskPosition = (task: TaskWithLabels) => {
    const taskStart = task.startDate ? new Date(task.startDate) : (task.dueDate ? new Date(task.dueDate) : null)
    const taskEnd = task.dueDate ? new Date(task.dueDate) : (task.startDate ? new Date(task.startDate) : null)
    
    if (!taskStart || !taskEnd) return null

    const isMilestone = !task.startDate && !!task.dueDate
    const start = startOfDay(taskStart)
    const end = startOfDay(taskEnd)

    const left = differenceInDays(start, timelineStart) * dayWidth
    const width = isMilestone ? 0 : (differenceInDays(end, start) + 1) * dayWidth

    if (left + width < 0) return null
    
    return { left, width, isMilestone }
  }

  const getColumnColor = (columnId: string) => {
    const col = columns.find(c => c.id === columnId)
    if (col?.name.toLowerCase().includes('done')) return '#22c55e'
    if (col?.name.toLowerCase().includes('progress')) return '#3b82f6'
    return '#e2e8f0'
  }

  return (
    <div className="bg-canvas flex flex-1 flex-col overflow-hidden">
      <GanttHeader
        currentDate={currentDate}
        viewMode={viewMode}
        onNext={next}
        onPrev={prev}
        onToday={goToToday}
        onViewModeChange={handleViewModeChange}
      />
      
      <div 
        className={`relative flex flex-1 overflow-auto bg-white ${draggedCardId || depDragging ? 'cursor-grabbing' : ''}`}
        ref={parentRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="flex min-h-full" 
          style={{ 
            width: 256 + units.length * (viewMode === 'day' ? dayWidth : viewMode === 'week' ? dayWidth * 7 : viewMode === 'month' ? dayWidth * 30 : dayWidth * 90) 
          }}
        >
          {/* Left Sidebar: Task List */}
          <div className="sticky left-0 z-30 flex w-64 shrink-0 flex-col border-r border-black bg-white">
            <div className="sticky top-0 z-40 flex h-10 items-center border-b border-black bg-white px-4 text-xs font-bold tracking-wider uppercase">
              Tasks
            </div>
            <div className="relative w-full" style={{ height: totalHeight }}>
              {virtualItems.map((virtualRow) => {
                const task = scheduledTasks[virtualRow.index]
                return (
                  <div 
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className="hover:bg-accent/10 absolute top-0 left-0 flex h-12 w-full cursor-pointer items-center truncate border-b border-black px-4 text-sm"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    onClick={() => onTaskClick(task.id)}
                  >
                    {task.title}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Content: Timeline */}
          <div className="relative flex-1">
            {/* Timeline Header */}
            <div className="sticky top-0 z-20 flex h-10 border-b border-black bg-white">
              {units.map((unit) => {
                let width = dayWidth
                if (viewMode === 'week') width = dayWidth * 7
                if (viewMode === 'month') {
                  const daysInMonth = differenceInDays(addMonths(unit, 1), unit)
                  width = dayWidth * daysInMonth
                }
                if (viewMode === 'quarter') {
                  const daysInQuarter = differenceInDays(addQuarters(unit, 1), unit)
                  width = dayWidth * daysInQuarter
                }

                return (
                  <div 
                    key={unit.getTime()} 
                    className={`flex shrink-0 items-center border-r border-black/20 px-2 text-[10px] font-bold tracking-tighter uppercase last:border-r-0 ${
                      (viewMode === 'day' && isToday(unit)) || (viewMode === 'month' && format(unit, 'yyyy-MM') === format(new Date(), 'yyyy-MM')) ? 'bg-accent/10' : ''
                    }`}
                    style={{ width }}
                  >
                    {viewMode === 'day' ? format(unit, 'd') : 
                     viewMode === 'week' ? `W${format(unit, 'w')}` :
                     viewMode === 'month' ? format(unit, 'MMM') :
                     `Q${format(unit, 'q')}`}
                  </div>
                )
              })}
            </div>

            {/* Timeline Grid & Bars */}
            <div className="relative min-h-full" style={{ height: totalHeight }}>
              {/* Vertical Grid Lines */}
              <div className="absolute inset-0 flex">
                {units.map((unit) => {
                   let width = dayWidth
                   if (viewMode === 'week') width = dayWidth * 7
                   if (viewMode === 'month') {
                     const daysInMonth = differenceInDays(addMonths(unit, 1), unit)
                     width = dayWidth * daysInMonth
                   }
                   if (viewMode === 'quarter') {
                     const daysInQuarter = differenceInDays(addQuarters(unit, 1), unit)
                     width = dayWidth * daysInQuarter
                   }
                   return (
                     <div 
                       key={`grid-${unit.getTime()}`} 
                       className="h-full border-r border-black/5 last:border-r-0"
                       style={{ width }}
                       data-role="day-cell"
                       data-date={format(unit, 'yyyy-MM-dd')}
                     />
                   )
                })}
              </div>

              {/* Dependency Lines */}
              <svg 
                className="pointer-events-none absolute inset-0 z-0 h-full w-full"
                style={{ minHeight: totalHeight }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                  </marker>
                  <marker id="arrowhead-error" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                  </marker>
                  <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                  </marker>
                </defs>
                {dependencies.map(dep => {
                  const blockingIndex = scheduledTasks.findIndex(t => t.id === dep.blockingTaskId)
                  const blockedIndex = scheduledTasks.findIndex(t => t.id === dep.blockedTaskId)
                  if (blockingIndex === -1 || blockedIndex === -1) return null
                  const blockingTask = scheduledTasks[blockingIndex]
                  const blockedTask = scheduledTasks[blockedIndex]
                  const blockingPos = getTaskPosition(blockingTask)
                  const blockedPos = getTaskPosition(blockedTask)
                  if (!blockingPos || !blockedPos) return null

                  const startY = blockingIndex * 48 + 24
                  const endY = blockedIndex * 48 + 24
                  let startX = 0, endX = 0, isConflict = false

                  const blockingStart = new Date(blockingTask.startDate || blockingTask.dueDate!)
                  const blockingEnd = new Date(blockingTask.dueDate || blockingTask.startDate!)
                  const blockedStart = new Date(blockedTask.startDate || blockedTask.dueDate!)
                  const blockedEnd = new Date(blockedTask.dueDate || blockedTask.startDate!)

                  if (dep.type === 'finish_to_start') {
                    startX = blockingPos.left + (blockingPos.isMilestone ? 8 : blockingPos.width)
                    endX = blockedPos.left - (blockedPos.isMilestone ? 8 : 0)
                    isConflict = isAfter(blockingEnd, blockedStart)
                  } else if (dep.type === 'start_to_start') {
                    startX = blockingPos.left - (blockingPos.isMilestone ? 8 : 0)
                    endX = blockedPos.left - (blockedPos.isMilestone ? 8 : 0)
                    isConflict = isAfter(blockingStart, blockedStart)
                  } else if (dep.type === 'finish_to_finish') {
                    startX = blockingPos.left + (blockingPos.isMilestone ? 8 : blockingPos.width)
                    endX = blockedPos.left + (blockingPos.isMilestone ? 8 : blockedPos.width)
                    isConflict = isAfter(blockingEnd, blockedEnd)
                  }

                  let d = ""
                  let midPoint = { x: 0, y: 0 }
                  if (dep.type === 'finish_to_start') {
                    const midX = startX + (endX - startX) / 2
                    if (endX > startX + 20) {
                      d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
                      midPoint = { x: midX, y: (startY + endY) / 2 }
                    } else {
                      const offset = 20
                      d = `M ${startX} ${startY} H ${startX + offset} V ${(startY + endY) / 2} H ${endX - offset} V ${endY} H ${endX}`
                      midPoint = { x: (startX + offset + endX - offset) / 2, y: (startY + endY) / 2 }
                    }
                  } else if (dep.type === 'start_to_start') {
                    const midX = Math.min(startX, endX) - 20
                    d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
                    midPoint = { x: midX, y: (startY + endY) / 2 }
                  } else if (dep.type === 'finish_to_finish') {
                    const midX = Math.max(startX, endX) + 20
                    d = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`
                    midPoint = { x: midX, y: (startY + endY) / 2 }
                  }

                  return (
                    <g key={dep.id} className="group/dep pointer-events-auto cursor-pointer" onMouseEnter={() => setHoveredDepId(dep.id)} onMouseLeave={() => setHoveredDepId(null)}>
                      <path d={d} fill="none" stroke="transparent" strokeWidth="12" className="cursor-pointer" />
                      <path d={d} fill="none" stroke={isConflict ? "#ef4444" : hoveredDepId === dep.id ? "#3b82f6" : "#000"} strokeWidth={hoveredDepId === dep.id ? "2.5" : "1.5"} markerEnd={`url(#${isConflict ? 'arrowhead-error' : hoveredDepId === dep.id ? 'arrowhead-hover' : 'arrowhead'})`} className={`transition-all ${isConflict ? "opacity-100" : hoveredDepId === dep.id ? "opacity-100" : "opacity-30"}`} />
                      {hoveredDepId === dep.id && (
                        <foreignObject x={midPoint.x - 10} y={midPoint.y - 10} width="20" height="20" className="pointer-events-auto">
                          <button onClick={(e) => { e.stopPropagation(); deleteDependency.mutate(dep.id) }} className="shadow-brutal-sm flex size-5 items-center justify-center border border-black bg-white text-black transition-transform hover:scale-110 active:scale-95">
                            <X size={12} strokeWidth={3} />
                          </button>
                        </foreignObject>
                      )}
                    </g>
                  )
                })}
                {depDragging && (() => {
                  const index = scheduledTasks.findIndex(t => t.id === depDragging.sourceTaskId)
                  if (index === -1) return null
                  const pos = getTaskPosition(scheduledTasks[index])
                  if (!pos) return null
                  const startX = pos.left + (pos.isMilestone ? 8 : pos.width), startY = index * 48 + 24
                  return <line x1={startX} y1={startY} x2={depDragging.mousePos.x} y2={depDragging.mousePos.y} stroke={depDragging.isCircular ? "#ef4444" : "#000"} strokeWidth="2" strokeDasharray="4" markerEnd={`url(#${depDragging.isCircular ? 'arrowhead-error' : 'arrowhead'})`} />
                })()}
              </svg>

              {/* Task Bars (Virtual) */}
              <div className="relative z-10 w-full" style={{ height: totalHeight }}>
                {virtualItems.map((virtualRow) => {
                  const task = scheduledTasks[virtualRow.index]
                  const pos = getTaskPosition(task)
                  if (!pos) return null

                  return (
                    <div key={virtualRow.key} className="absolute top-0 left-0 w-full" style={{ height: 48, transform: `translateY(${virtualRow.start}px)` }}>
                      <div className="group relative h-full border-b border-black/10">
                        <div
                          className={`absolute top-1/2 -translate-y-1/2 transition-all ${pos.isMilestone ? 'z-20' : 'z-10'} ${task.archivedAt ? 'opacity-40 grayscale-[0.5]' : ''}`}
                          style={{ left: pos.left, width: pos.isMilestone ? 16 : pos.width, marginLeft: pos.isMilestone ? -8 : 0 }}
                        >
                          {pos.isMilestone ? (
                            <div className={`shadow-brutal-sm size-4 rotate-45 cursor-grab border-2 border-black active:cursor-grabbing ${task.archivedAt ? 'cursor-default' : ''}`} style={{ backgroundColor: getColumnColor(task.columnId) }} title={`${task.title} (Due: ${format(new Date(task.dueDate!), 'MMM d')})${task.archivedAt ? ' [ARCHIVED]' : ''}`} onClick={() => onTaskClick(task.id)} onMouseDown={(e) => !task.archivedAt && handleCardDragStart(task, e)} data-role="task-bar" data-task-id={task.id}>
                              {!task.archivedAt && <div className="absolute -top-1 -right-1 z-30 size-3 -rotate-45 cursor-crosshair rounded-full border border-black bg-white opacity-0 transition-all group-hover:opacity-100 hover:scale-125 hover:bg-black" onMouseDown={(e) => handleDependencyDragStart(task.id, e)} />}
                            </div>
                          ) : (
                            <div className={`shadow-brutal-sm flex h-6 cursor-grab items-center overflow-hidden rounded-sm border-2 border-black transition-transform active:cursor-grabbing ${task.archivedAt ? 'cursor-default hover:scale-100' : 'hover:scale-[1.02]'}`} style={{ backgroundColor: getColumnColor(task.columnId) }} onClick={() => onTaskClick(task.id)} onMouseDown={(e) => !task.archivedAt && handleCardDragStart(task, e)} data-role="task-bar" data-task-id={task.id}>
                              {task.checklistProgress && task.checklistProgress.total > 0 && <div className="absolute top-0 bottom-0 left-0 z-0 bg-black/10 transition-all duration-500" style={{ width: `${(task.checklistProgress.completed / task.checklistProgress.total) * 100}%`, backgroundColor: 'rgba(0, 0, 0, 0.15)' }} />}
                              {!task.archivedAt && <div className="absolute top-0 bottom-0 left-0 z-20 w-1.5 cursor-ew-resize bg-black/10 opacity-0 group-hover:opacity-100 hover:bg-black/30" onMouseDown={(e) => handleResizeStart(task.id, 'left', e)} />}
                              <div className="flex flex-1 items-center px-2 text-[10px] font-bold whitespace-nowrap text-black uppercase opacity-0 transition-opacity group-hover:opacity-100">
                                {task.title}
                                {task.archivedAt && <span className="ml-2 rounded-full border border-black bg-black px-1.5 py-0.5 text-[8px] text-white">Archived</span>}
                              </div>
                              {!task.archivedAt && <div className="absolute top-0 right-0 bottom-0 z-20 w-1.5 cursor-ew-resize bg-black/10 opacity-0 group-hover:opacity-100 hover:bg-black/30" onMouseDown={(e) => handleResizeStart(task.id, 'right', e)} />}
                              {!task.archivedAt && <div className="absolute top-1/2 -right-1 z-30 size-3 -translate-y-1/2 cursor-crosshair rounded-full border border-black bg-white opacity-0 transition-all group-hover:opacity-100 hover:scale-125 hover:bg-black" onMouseDown={(e) => handleDependencyDragStart(task.id, e)} />}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unscheduled Section */}
      <div className="flex h-32 shrink-0 border-t-4 border-black bg-white">
        <div className="bg-accent/10 flex w-64 shrink-0 items-center justify-center border-r-2 border-black px-4 text-xs font-bold tracking-wider uppercase">
          Unscheduled
        </div>
        <div className="bg-canvas flex flex-1 items-center gap-4 overflow-x-auto p-4">
          {unscheduledTasks.length === 0 ? (
            <div className="text-xs font-medium text-black/40 italic">
              {isFiltering ? 'No unscheduled tasks match your filters' : 'All tasks have dates'}
            </div>
          ) : (
            unscheduledTasks.map(task => (
              <div 
                key={task.id}
                className="shadow-brutal-sm flex h-16 w-48 shrink-0 cursor-grab items-center justify-center border-2 border-black bg-white p-2 text-center text-xs font-bold transition-transform hover:-translate-y-1 active:cursor-grabbing"
                onMouseDown={(e) => handleCardDragStart(task, e)}
                onClick={() => onTaskClick(task.id)}
              >
                {task.title}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
