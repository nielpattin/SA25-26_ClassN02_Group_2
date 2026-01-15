import { Avatar } from './ui/Avatar'
import { Check } from 'lucide-react'

interface Member {
  id: string
  name: string | null
  image: string | null
}

interface AssigneesProps {
  currentAssignees: string[]
  boardMembers: Member[]
  onToggle: (userId: string) => void
  variant?: 'display' | 'picker'
}

export function AssigneeSection({ currentAssignees, boardMembers, onToggle, variant = 'display' }: AssigneesProps) {
  const assignedMembers = boardMembers.filter(m => currentAssignees.includes(m.id))

  if (variant === 'display') {
    if (assignedMembers.length === 0) return null

    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-2">
          {assignedMembers.map(member => (
            <div key={member.id} className="relative flex" title={member.name || 'Unknown'}>
              <Avatar src={member.image || undefined} fallback={member.name || 'Unknown'} size="sm" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-1 min-w-60">
      <div className="flex flex-col gap-1">
        {boardMembers.map(member => {
          const isAssigned = currentAssignees.includes(member.id)
          return (
            <button
              key={member.id}
              className={`flex items-center gap-3 p-2.5 bg-white border-2 border-black font-body text-[13px] font-extrabold uppercase transition-all text-left ${isAssigned ? 'bg-[#EEEEEE] shadow-inner-brutal' : 'hover:bg-accent hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md'}`}
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
