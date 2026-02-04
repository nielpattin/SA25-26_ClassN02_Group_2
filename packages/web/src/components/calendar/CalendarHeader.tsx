import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ViewMode } from '../../hooks/useCalendarNavigation'

type CalendarHeaderProps = {
  currentDate: Date
  viewMode: ViewMode
  onNext: () => void
  onPrev: () => void
  onToday: () => void
  onViewModeChange: (mode: ViewMode) => void
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onNext,
  onPrev,
  onToday,
  onViewModeChange,
}: CalendarHeaderProps) {
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
    return format(currentDate, 'MMMM yyyy')
  }

  return (
    <div className="flex items-center justify-between border-b border-black bg-white px-6 py-4">
      <div className="flex items-center gap-4">
        <h2 className="w-64 font-heading text-xl font-bold text-black">{getRangeLabel()}</h2>
        <div className="flex items-center border border-black bg-white shadow-brutal-sm">
          <button
            onClick={onPrev}
            className="flex size-8 cursor-pointer items-center justify-center border-r border-black transition-colors hover:bg-accent"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={onNext}
            className="flex size-8 cursor-pointer items-center justify-center transition-colors hover:bg-accent"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={onToday}
          className="h-8 cursor-pointer border border-black bg-white px-3 text-xs font-bold uppercase shadow-brutal-sm transition-all hover:-translate-px hover:bg-accent hover:shadow-none"
        >
          Today
        </button>
      </div>

      <div className="flex items-center border border-black bg-white shadow-brutal-sm">
        {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
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
