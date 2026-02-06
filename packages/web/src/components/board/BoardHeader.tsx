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
    <header className="shrink-0 border-b border-black bg-canvas">
      <div className="flex items-center justify-between gap-4 px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/boards"
            className="shrink-0 text-sm font-extrabold text-black uppercase hover:bg-accent hover:px-1 hover:shadow-brutal-sm"
          >
            Workspace
          </Link>
          <ChevronRight size={14} className="shrink-0 text-text-muted" />
          <h1 className="m-0 truncate font-heading text-[18px] font-bold whitespace-nowrap text-black">{boardName}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <PresenceStrip presence={presence} />
          <SearchTrigger />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-black/10 px-6 py-2">
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
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex items-center gap-0 border border-black bg-white shadow-brutal-sm">
            <button
              onClick={() => onViewChange('kanban')}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center transition-all ${
                currentView === 'kanban' ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              title="Kanban View"
            >
              <Kanban size={16} />
            </button>
            <div className="h-8 w-px bg-black" />
            <button
              onClick={() => onViewChange('calendar')}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center transition-all ${
                currentView === 'calendar' ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              title="Calendar View"
            >
              <Calendar size={16} />
            </button>
            <div className="h-8 w-px bg-black" />
            <button
              onClick={() => onViewChange('gantt')}
              className={`flex h-8 w-8 cursor-pointer items-center justify-center transition-all ${
                currentView === 'gantt' ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
              title="Gantt View"
            >
              <ChartGantt size={16} />
            </button>
          </div>
          <button
            onClick={onOpenArchive}
            className="flex h-8 w-8 cursor-pointer items-center justify-center border border-black bg-white shadow-brutal-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:bg-accent hover:shadow-none"
            title="Open Archive"
          >
            <Archive size={16} />
          </button>
          <Dropdown
            trigger={
              <button className="flex h-8 w-8 cursor-pointer items-center justify-center border border-black bg-white shadow-brutal-sm transition-all hover:-translate-x-px hover:-translate-y-px hover:bg-accent hover:shadow-none">
                <MoreHorizontal size={16} />
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
        </div>
      </div>
    </header>
  )
}
