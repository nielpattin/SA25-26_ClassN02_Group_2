import { Link } from '@tanstack/react-router'
import { ChevronRight, Archive, Download, Kanban, Calendar, ChartGantt, MoreHorizontal, Share2, History } from 'lucide-react'
import { PresenceStrip } from './PresenceStrip'
import { BoardFilterBar } from '../filters'
import { SearchTrigger } from '../search'
import { Dropdown } from '../ui/Dropdown'
import type { ViewMode, BoardFilters, DueDateFilter } from '../../hooks/useBoardPreferences'
import type { Label } from '../../hooks/useLabels'
import type { BoardMember } from '../../hooks/useAssignees'
import type { PresenceUser } from '../../hooks/useBoardSocket'

export type BoardHeaderProps = {
  boardName: string
  presence: PresenceUser[]
  pendingFilters: BoardFilters
  labels: Label[]
  members: BoardMember[]
  hasActiveFilters: boolean
  hasPendingChanges: boolean
  currentView: ViewMode
  isBoardAdmin: boolean
  onLabelToggle: (labelId: string) => void
  onAssigneeToggle: (userId: string) => void
  onDueDateChange: (filter: DueDateFilter | null) => void
  onApplyFilters: () => void
  onClearFilters: () => void
  onViewChange: (view: ViewMode) => void
  onOpenArchive: () => void
  onOpenExport: () => void
  onOpenActivityExport: () => void
  onOpenPublish: () => void
}

export function BoardHeader({
  boardName,
  presence,
  pendingFilters,
  labels,
  members,
  hasActiveFilters,
  hasPendingChanges,
  currentView,
  isBoardAdmin,
  onLabelToggle,
  onAssigneeToggle,
  onDueDateChange,
  onApplyFilters,
  onClearFilters,
  onViewChange,
  onOpenArchive,
  onOpenExport,
  onOpenActivityExport,
  onOpenPublish,
}: BoardHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-black bg-canvas px-6 py-4">
      <div className="flex items-center gap-3">
        <Link
          to="/boards"
          className="text-sm font-extrabold text-black uppercase hover:bg-accent hover:px-1 hover:shadow-brutal-sm"
        >
          Workspace
        </Link>
        <ChevronRight size={14} className="text-text-muted" />
        <h1 className="m-0 font-heading text-[18px] font-bold text-black">{boardName}</h1>
        <div className="ml-4">
          <PresenceStrip presence={presence} />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <BoardFilterBar
          pendingFilters={pendingFilters}
          labels={labels}
          members={members}
          hasActiveFilters={hasActiveFilters}
          hasPendingChanges={hasPendingChanges}
          onLabelToggle={onLabelToggle}
          onAssigneeToggle={onAssigneeToggle}
          onDueDateChange={onDueDateChange}
          onApply={onApplyFilters}
          onClear={onClearFilters}
        />
        <div className="flex items-center gap-0 border border-black bg-white shadow-brutal-sm">
          <button
            onClick={() => onViewChange('kanban')}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center transition-all ${
              currentView === 'kanban' ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
            title="Kanban View"
          >
            <Kanban size={18} />
          </button>
          <div className="h-9 w-px bg-black" />
          <button
            onClick={() => onViewChange('calendar')}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center transition-all ${
              currentView === 'calendar' ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
            title="Calendar View"
          >
            <Calendar size={18} />
          </button>
          <div className="h-9 w-px bg-black" />
          <button
            onClick={() => onViewChange('gantt')}
            className={`flex h-9 w-9 cursor-pointer items-center justify-center transition-all ${
              currentView === 'gantt' ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
            title="Gantt View"
          >
            <ChartGantt size={18} />
          </button>
        </div>
        <button
          onClick={onOpenArchive}
          className="flex h-9 w-9 cursor-pointer items-center justify-center border border-black bg-white shadow-brutal-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:bg-accent hover:shadow-none"
          title="Open Archive"
        >
          <Archive size={18} />
        </button>
        <Dropdown
          trigger={
            <button className="flex h-9 w-9 cursor-pointer items-center justify-center border border-black bg-white shadow-brutal-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:bg-accent hover:shadow-none">
              <MoreHorizontal size={18} />
            </button>
          }
          items={[
            {
              label: 'Export Board',
              icon: <Download size={16} />,
              onClick: onOpenExport,
            },
            ...(isBoardAdmin
              ? [
                  {
                    label: 'Export Activity Log',
                    icon: <History size={16} />,
                    onClick: onOpenActivityExport,
                  },
                ]
              : []),
            {
              label: 'Publish to Market',
              icon: <Share2 size={16} />,
              onClick: onOpenPublish,
            },
          ]}
        />
        <SearchTrigger />
      </div>
    </header>
  )
}
