import { Check, X } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import type { BoardMember } from '../CardModalTypes'

interface AssigneesProps {
  currentAssignees: string[]
  boardMembers: BoardMember[]
  onToggle: (userId: string) => void
  variant?: 'sidebar-list' | 'picker'
}

export function AssigneeSection({ currentAssignees = [], boardMembers = [], onToggle, variant = 'sidebar-list' }: AssigneesProps) {
  const assignedMembers = (boardMembers || []).filter(m => (currentAssignees || []).includes(m.userId))

  if (variant === 'sidebar-list') {
    if (assignedMembers.length === 0) return null

    return (
      <div className="flex flex-col gap-2">
        {assignedMembers.map(member => (
          <div 
            key={member.userId}
            className="group flex items-center gap-3 border-2 border-black bg-white p-2 font-body text-[13px] font-extrabold uppercase shadow-brutal-sm transition-all hover:-translate-y-0.5 hover:shadow-brutal-md"
          >
            <Avatar src={member.userImage || undefined} fallback={member.userName || 'Unknown'} size="sm" />
            <span className="flex-1 truncate text-black">{member.userName || 'Unknown'}</span>
            <button 
              className="flex cursor-pointer items-center justify-center border border-black bg-white p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-text-danger hover:text-white"
              onClick={() => onToggle(member.userId)}
              title="Remove member"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-w-60 flex-col p-1">
      <div className="flex flex-col gap-1">
        {boardMembers.map(member => {
          const isAssigned = currentAssignees.includes(member.userId)
          return (
            <button
              key={member.userId}
              className={`flex cursor-pointer items-center gap-3 border border-black bg-white p-2.5 text-left font-body text-[13px] font-extrabold uppercase transition-all ${isAssigned ? 'shadow-inner-brutal bg-active' : 'hover:-translate-0.5 hover:bg-accent hover:shadow-brutal-md'}`}
              onClick={() => onToggle(member.userId)}
            >
              <Avatar src={member.userImage || undefined} fallback={member.userName || 'Unknown'} size="sm" />
              <span className="flex-1 truncate">{member.userName || member.userId}</span>
              {isAssigned && <Check size={14} className="shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
