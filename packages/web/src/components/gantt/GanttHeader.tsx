import { format, startOfWeek, endOfWeek, getQuarter, getYear } from 'date-fns'
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { type ZoomMode, type TaskStatusFilter } from '../../hooks/useBoardPreferences'

type GanttHeaderProps = {
  currentDate?: Date
  zoomMode: ZoomMode
  onNext?: () => void
  onPrev?: () => void
  onToday?: () => void
  onZoomModeChange: (mode: ZoomMode) => void
  status: TaskStatusFilter
  onStatusChange: (status: TaskStatusFilter) => void
}

export function GanttHeader({
  currentDate = new Date(),
  zoomMode,
  onNext,
  onPrev,
  onToday,
  onZoomModeChange,
  status,
  onStatusChange,
}: GanttHeaderProps) {
  const getRangeLabel = () => {
    if (zoomMode === 'day') {
      return format(currentDate, 'MMMM d, yyyy')
    }
    if (zoomMode === 'week') {
      const start = startOfWeek(currentDate)
      const end = endOfWeek(currentDate)
      if (start.getMonth() === end.getMonth()) {
        return `${format(start, 'MMMM d')} - ${format(end, 'd, yyyy')}`
      }
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
    }
    if (zoomMode === 'quarter') {
      const quarter = getQuarter(currentDate)
      const year = getYear(currentDate)
      return `Q${quarter} ${year}`
    }
    return format(currentDate, 'MMMM yyyy')
  }

  return (
    <div className="flex items-center justify-between border-b border-black bg-white px-6 py-4">
      <div className="flex items-center gap-4">
        <h2 className="w-64 font-heading text-xl font-bold text-black">{getRangeLabel()}</h2>
        {(onPrev || onNext) && (
          <div className="flex items-center border border-black bg-white shadow-brutal-sm">
            {onPrev && (
              <button
                onClick={onPrev}
                className="flex size-8 cursor-pointer items-center justify-center border-r border-black transition-colors hover:bg-accent"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {onNext && (
              <button
                onClick={onNext}
                className="flex size-8 cursor-pointer items-center justify-center transition-colors hover:bg-accent"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
        {onToday && (
          <button
            onClick={onToday}
            className="h-8 cursor-pointer border border-black bg-white px-3 text-xs font-bold uppercase shadow-brutal-sm transition-all hover:-translate-px hover:bg-accent hover:shadow-none"
          >
            Today
          </button>
        )}

        <div className="mx-2 h-8 w-px bg-black/10" />

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-black/40" />
          <div className="flex items-center border border-black bg-white shadow-brutal-sm">
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

      <div className="flex items-center border border-black bg-white shadow-brutal-sm">
        {(['day', 'week', 'month', 'quarter'] as ZoomMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => onZoomModeChange(mode)}
            className={`h-8 cursor-pointer border-r border-black px-4 text-xs font-bold uppercase transition-colors last:border-r-0 ${
              zoomMode === mode ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
