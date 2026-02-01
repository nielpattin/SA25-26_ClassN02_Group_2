import { format, startOfWeek, endOfWeek, getQuarter, getYear } from 'date-fns'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { type ViewMode } from '../../hooks/useCalendarNavigation'
import { TaskStatusFilter } from '../../hooks/useBoardFilters'

type GanttHeaderProps = {
  currentDate?: Date
  viewMode: ViewMode
  onNext?: () => void
  onPrev?: () => void
  onToday?: () => void
  onViewModeChange: (mode: ViewMode) => void
  status: TaskStatusFilter
  onStatusChange: (status: TaskStatusFilter) => void
}

export function GanttHeader({
  currentDate = new Date(),
  viewMode,
  onNext,
  onPrev,
  onToday,
  onViewModeChange,
  status,
  onStatusChange,
}: GanttHeaderProps) {
  const getRangeLabel = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'MMMM d, yyyy')
    }
    if (viewMode === 'week') {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`
      }
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
    }
    if (viewMode === 'quarter') {
      const quarter = getQuarter(currentDate)
      const year = getYear(currentDate)
      return `Q${quarter} ${year}`
    }
    return format(currentDate, 'MMMM yyyy')
  }

  return (
    <div className="flex items-center justify-between border-b border-black bg-white px-6 py-4">
      <div className="flex items-center gap-4">
        <h2 className="font-heading w-64 text-xl font-bold text-black">{getRangeLabel()}</h2>
        {(onPrev || onNext) && (
          <div className="shadow-brutal-sm flex items-center border border-black bg-white">
            {onPrev && (
              <button
                onClick={onPrev}
                className="hover:bg-accent flex size-8 cursor-pointer items-center justify-center border-r border-black transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {onNext && (
              <button
                onClick={onNext}
                className="hover:bg-accent flex size-8 cursor-pointer items-center justify-center transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
        {onToday && (
          <button
            onClick={onToday}
            className="shadow-brutal-sm hover:bg-accent h-8 cursor-pointer border border-black bg-white px-3 text-xs font-bold uppercase transition-all hover:-translate-px hover:shadow-none"
          >
            Today
          </button>
        )}

        <div className="mx-2 h-8 w-px bg-black/10" />

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-black/40" />
          <div className="shadow-brutal-sm flex items-center border border-black bg-white">
            {(['active', 'completed', 'all'] as TaskStatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={`h-8 cursor-pointer border-r border-black px-3 text-[10px] font-bold uppercase transition-colors last:border-r-0 ${
                  status === s ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shadow-brutal-sm flex items-center border border-black bg-white">
        {(['day', 'week', 'month', 'quarter'] as ViewMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => onViewModeChange(mode)}
            className={`h-8 cursor-pointer border-r border-black px-4 text-xs font-bold uppercase transition-colors last:border-r-0 ${
              viewMode === mode ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
