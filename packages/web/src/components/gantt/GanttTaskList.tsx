import { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { TaskWithLabels } from '../../hooks/useTasks'

type GanttTaskListProps = {
  tasks: TaskWithLabels[]
  onScroll?: (scrollTop: number) => void
  scrollTop?: number
  isCollapsed?: boolean
  onTaskClick?: (id: string) => void
}

export function GanttTaskList({ 
  tasks, 
  onScroll, 
  scrollTop, 
  isCollapsed,
  onTaskClick 
}: GanttTaskListProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 5,
  })

  useEffect(() => {
    if (containerRef.current && scrollTop !== undefined) {
      containerRef.current.scrollTop = scrollTop
    }
  }, [scrollTop])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    onScroll?.(e.currentTarget.scrollTop)
  }

  return (
    <div 
      className={`bg-canvas flex min-h-0 shrink-0 flex-col border-r border-black transition-all duration-300 ${
        isCollapsed ? 'w-0 overflow-hidden opacity-0' : 'w-72'
      }`}
    >
      <div className="sticky top-0 z-20 flex h-[100px] flex-col border-b border-black bg-white">
        {/* Today marker row spacer */}
        <div className="h-5 border-b border-black/10" />
        {/* Month header row spacer */}
        <div className="flex h-10 items-center border-b border-black/10 px-4">
          <span className="text-xs font-bold tracking-widest text-black uppercase">Tasks</span>
        </div>
        {/* Day header row spacer */}
        <div className="h-10" />
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="scrollbar-hide min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const task = tasks[virtualRow.index]
            return (
              <div 
                key={virtualRow.key} 
                className="group absolute top-0 left-0 flex h-[48px] w-full cursor-pointer items-center border-b border-black/5 px-4 hover:bg-black/5"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                onClick={() => onTaskClick?.(task.id)}
              >
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate text-xs font-bold tracking-tight text-black uppercase">{task.title}</span>
                  {(!task.startDate || !task.dueDate) && (
                    <span className="text-[10px] font-medium tracking-tight text-black/40 uppercase">No dates</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {tasks.length === 0 && (
          <div className="p-4 text-xs text-black/50 italic">
            No tasks found
          </div>
        )}
      </div>
    </div>
  )
}
