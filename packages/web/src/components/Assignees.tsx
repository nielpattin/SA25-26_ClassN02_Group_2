import { Avatar } from './ui/Avatar'
import { Check } from 'lucide-react'
import './Assignees.css'

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
      <div className="assignee-section">
        <div className="assignees-list">
          {assignedMembers.map(member => (
            <div key={member.id} className="assignee-item" title={member.name || 'Unknown'}>
              <Avatar src={member.image || undefined} fallback={member.name || 'Unknown'} size="sm" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="assignee-picker">
      <div className="picker-list">
        {boardMembers.map(member => {
          const isAssigned = currentAssignees.includes(member.id)
          return (
            <button
              key={member.id}
              className={`picker-option ${isAssigned ? 'active' : ''}`}
              onClick={() => onToggle(member.id)}
            >
              <Avatar src={member.image || undefined} fallback={member.name || 'Unknown'} size="sm" />
              <span className="member-name">{member.name || member.id}</span>
              {isAssigned && <Check size={14} className="check-icon" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
