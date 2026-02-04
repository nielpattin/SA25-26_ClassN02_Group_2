import { useState, useRef } from 'react'
import { Plus } from 'lucide-react'
import { Popover } from '../ui/Popover'
import { AssigneeSection } from './Assignees'
import { useBoardMembers, useToggleAssignee } from '../../hooks'

interface TaskAssigneesProps {
  taskId: string
  boardId: string
  currentAssignees: string[]
}

export function TaskAssignees({ taskId, boardId, currentAssignees }: TaskAssigneesProps) {
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const assignedTriggerRef = useRef<HTMLButtonElement>(null)

  const { data: boardMembers = [] } = useBoardMembers(boardId)
  const toggleAssignee = useToggleAssignee(taskId, boardId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="m-0 flex items-center gap-1.5 font-heading text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
          Assigned
        </h3>
        <button
          ref={assignedTriggerRef}
          className="flex h-7 w-7 cursor-pointer items-center justify-center border border-black bg-white hover:bg-accent"
          onClick={() => setIsMembersOpen(!isMembersOpen)}
        >
          <Plus size={14} strokeWidth={3} />
        </button>
      </div>

      <Popover
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        triggerRef={assignedTriggerRef}
        title="Members"
      >
        <AssigneeSection
          variant="picker"
          currentAssignees={currentAssignees}
          boardMembers={boardMembers}
          onToggle={userId => {
            const isAssigned = currentAssignees.includes(userId)
            toggleAssignee.mutate({ userId, isAssigned })
          }}
        />
      </Popover>

      <AssigneeSection
        variant="sidebar-list"
        currentAssignees={currentAssignees}
        boardMembers={boardMembers}
        onToggle={userId => toggleAssignee.mutate({ userId, isAssigned: true })}
      />
    </div>
  )
}
