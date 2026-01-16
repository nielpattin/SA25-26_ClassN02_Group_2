import { Check, X } from 'lucide-react'
import { Avatar } from './ui/Avatar'

interface Member {
  id: string
  name: string | null
  image: string | null
}

interface AssigneesProps {
  currentAssignees: string[]
  boardMembers: Member[]
  onToggle: (userId: string) => void
  variant?: 'sidebar-list' | 'picker'
}

export function AssigneeSection({ currentAssignees = [], boardMembers = [], onToggle, variant = 'sidebar-list' }: AssigneesProps) {
  const assignedMembers = (boardMembers || []).filter(m => (currentAssignees || []).includes(m.id))

  if (variant === 'sidebar-list') {
    if (assignedMembers.length === 0) return null

    return (
      <div className="flex flex-col gap-2">
        {assignedMembers.map(member => (
          <div 
            key={member.id}
            className="font-body shadow-brutal-sm hover:shadow-brutal-md group flex items-center gap-3 border-2 border-black bg-white p-2 text-[13px] font-extrabold uppercase transition-all hover:-translate-y-0.5"
          >
            <Avatar src={member.image || undefined} fallback={member.name || 'Unknown'} size="sm" />
            <span className="flex-1 truncate text-black">{member.name || 'Unknown'}</span>
            <button 
              className="hover:bg-text-danger flex cursor-pointer items-center justify-center border border-black bg-white p-1 opacity-0 transition-all group-hover:opacity-100 hover:text-white"
              onClick={() => onToggle(member.id)}
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
          const isAssigned = currentAssignees.includes(member.id)
          return (
            <button
              key={member.id}
              className={`font-body flex cursor-pointer items-center gap-3 border border-black bg-white p-2.5 text-left text-[13px] font-extrabold uppercase transition-all ${isAssigned ? 'shadow-inner-brutal bg-[#EEEEEE]' : 'hover:bg-accent hover:shadow-brutal-md hover:-translate-0.5'}`}
              onClick={() => onToggle(member.id)}
            >
              <Avatar src={member.image || undefined} fallback={member.name || 'Unknown'} size="sm" />
              <span className="flex-1 truncate">{member.name || member.id}</span>
              {isAssigned && <Check size={14} className="shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
