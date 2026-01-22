import { useState } from 'react'
import { ChevronDown, Tag, Users, Calendar, X, Check } from 'lucide-react'
import { FilterDropdown } from './FilterDropdown'
import type { BoardFilters, DueDateFilter } from '../../hooks/useBoardFilters'
import type { Label } from '../../hooks/useLabels'
import type { BoardMember } from '../../hooks/useAssignees'

interface BoardFilterBarProps {
  pendingFilters: BoardFilters
  labels: Label[]
  members: BoardMember[]
  hasActiveFilters: boolean
  hasPendingChanges: boolean
  onLabelToggle: (labelId: string) => void
  onAssigneeToggle: (userId: string) => void
  onDueDateChange: (filter: DueDateFilter | null) => void
  onApply: () => void
  onClear: () => void
}

const DUE_DATE_OPTIONS: { value: DueDateFilter; label: string }[] = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'due-today', label: 'Due Today' },
  { value: 'due-this-week', label: 'Due This Week' },
  { value: 'due-this-month', label: 'Due This Month' },
  { value: 'no-due-date', label: 'No Due Date' },
]

export function BoardFilterBar({
  pendingFilters,
  labels,
  members,
  hasActiveFilters,
  hasPendingChanges,
  onLabelToggle,
  onAssigneeToggle,
  onDueDateChange,
  onApply,
  onClear,
}: BoardFilterBarProps) {
  const [openDropdown, setOpenDropdown] = useState<'labels' | 'assignees' | 'dueDate' | null>(null)

  const activeFilterCount =
    pendingFilters.labelIds.length +
    pendingFilters.assigneeIds.length +
    (pendingFilters.dueDate ? 1 : 0)

  return (
    <div className="flex items-center gap-2">
      <FilterDropdown
        isOpen={openDropdown === 'labels'}
        onOpenChange={open => setOpenDropdown(open ? 'labels' : null)}
        trigger={
          <button className="flex items-center gap-1.5 border border-black bg-white px-2.5 py-1.5 text-xs font-bold uppercase transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px">
            <Tag size={12} />
            <span>Labels</span>
            {pendingFilters.labelIds.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center bg-black text-[10px] text-white">
                {pendingFilters.labelIds.length}
              </span>
            )}
            <ChevronDown size={12} />
          </button>
        }
      >
        <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
          {labels.length === 0 ? (
            <p className="px-2 py-1 text-xs text-gray-500">No labels</p>
          ) : (
            labels.map(label => {
              const isSelected = pendingFilters.labelIds.includes(label.id)
              return (
                <button
                  key={label.id}
                  onClick={() => onLabelToggle(label.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 text-left text-xs font-bold uppercase transition-colors hover:bg-black/5 ${isSelected ? 'bg-black/10' : ''}`}
                >
                  <span
                    className="h-3 w-3 shrink-0 border border-black"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="flex-1 truncate">{label.name}</span>
                  {isSelected && <Check size={12} />}
                </button>
              )
            })
          )}
        </div>
      </FilterDropdown>

      <FilterDropdown
        isOpen={openDropdown === 'assignees'}
        onOpenChange={open => setOpenDropdown(open ? 'assignees' : null)}
        trigger={
          <button className="flex items-center gap-1.5 border border-black bg-white px-2.5 py-1.5 text-xs font-bold uppercase transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px">
            <Users size={12} />
            <span>Assignees</span>
            {pendingFilters.assigneeIds.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center bg-black text-[10px] text-white">
                {pendingFilters.assigneeIds.length}
              </span>
            )}
            <ChevronDown size={12} />
          </button>
        }
      >
        <div className="flex max-h-60 flex-col gap-1 overflow-y-auto">
          <button
            onClick={() => onAssigneeToggle('unassigned')}
            className={`flex items-center gap-2 px-2 py-1.5 text-left text-xs font-bold uppercase transition-colors hover:bg-black/5 ${pendingFilters.assigneeIds.includes('unassigned') ? 'bg-black/10' : ''}`}
          >
            <span className="flex h-5 w-5 items-center justify-center border border-dashed border-black bg-gray-100 text-[10px]">
              ?
            </span>
            <span className="flex-1">Unassigned</span>
            {pendingFilters.assigneeIds.includes('unassigned') && <Check size={12} />}
          </button>
          {members.map(member => {
            const isSelected = pendingFilters.assigneeIds.includes(member.userId)
            return (
              <button
                key={member.id}
                onClick={() => onAssigneeToggle(member.userId)}
                className={`flex items-center gap-2 px-2 py-1.5 text-left text-xs font-bold uppercase transition-colors hover:bg-black/5 ${isSelected ? 'bg-black/10' : ''}`}
              >
                {member.userImage ? (
                  <img
                    src={member.userImage}
                    alt={member.userName || ''}
                    className="h-5 w-5 border border-black object-cover"
                  />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center border border-black bg-gray-100 text-[10px]">
                    {member.userName?.[0] || '?'}
                  </span>
                )}
                <span className="flex-1 truncate">{member.userName || 'Unknown'}</span>
                {isSelected && <Check size={12} />}
              </button>
            )
          })}
        </div>
      </FilterDropdown>

      <FilterDropdown
        isOpen={openDropdown === 'dueDate'}
        onOpenChange={open => setOpenDropdown(open ? 'dueDate' : null)}
        trigger={
          <button className="flex items-center gap-1.5 border border-black bg-white px-2.5 py-1.5 text-xs font-bold uppercase transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-px hover:-translate-y-px">
            <Calendar size={12} />
            <span>
              {pendingFilters.dueDate
                ? DUE_DATE_OPTIONS.find(o => o.value === pendingFilters.dueDate)?.label
                : 'Due Date'}
            </span>
            <ChevronDown size={12} />
          </button>
        }
      >
        <div className="flex flex-col gap-1">
          {DUE_DATE_OPTIONS.map(option => {
            const isSelected = pendingFilters.dueDate === option.value
            return (
              <button
                key={option.value}
                onClick={() => onDueDateChange(isSelected ? null : option.value)}
                className={`flex items-center gap-2 px-2 py-1.5 text-left text-xs font-bold uppercase transition-colors hover:bg-black/5 ${isSelected ? 'bg-black/10' : ''}`}
              >
                <span className="flex-1">{option.label}</span>
                {isSelected && <Check size={12} />}
              </button>
            )
          })}
        </div>
      </FilterDropdown>

      <button
        onClick={onApply}
        disabled={!hasPendingChanges}
        className="border border-black bg-black px-3 py-1.5 text-xs font-bold text-white uppercase transition-all enabled:hover:bg-white enabled:hover:text-black enabled:hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] enabled:hover:-translate-x-px enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
      >
        Apply
      </button>

      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 border border-black bg-white px-2.5 py-1.5 text-xs font-bold uppercase transition-all hover:bg-red-500 hover:text-white"
        >
          <X size={12} />
          <span>Clear</span>
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center bg-black text-[10px] text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
