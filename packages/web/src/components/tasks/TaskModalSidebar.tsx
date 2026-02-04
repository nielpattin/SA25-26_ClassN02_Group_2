import { useRef, useState } from 'react'
import { Calendar, Flag, Image, Scaling } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Popover } from '../ui/Popover'
import { DatePicker } from '../ui/DatePicker'
import { ChecklistCreator } from '../checklist'
import { TaskAssignees } from './TaskAssignees'
import { ReminderSelect } from './ReminderSelect'
import type { Card } from '../CardModalTypes'

const PRIORITIES = [
  { id: 'urgent', name: 'Urgent', color: '#E74C3C' },
  { id: 'high', name: 'High', color: '#E67E22' },
  { id: 'medium', name: 'Medium', color: '#F1C40F' },
  { id: 'low', name: 'Low', color: '#2ECC71' },
  { id: 'none', name: 'None', color: '#95A5A6' },
]

const SIZES = [
  { id: 'xs', name: 'XS', label: 'Extra Small' },
  { id: 's', name: 'S', label: 'Small' },
  { id: 'm', name: 'M', label: 'Medium' },
  { id: 'l', name: 'L', label: 'Large' },
  { id: 'xl', name: 'XL', label: 'Extra Large' },
]

interface TaskModalSidebarProps {
  card: Card
  taskId: string
  boardId: string
  onUpdateCard: (updates: Partial<Card>) => void
  onCreateChecklist: (title: string) => void
}

export function TaskModalSidebar({
  card,
  taskId,
  boardId,
  onUpdateCard,
  onCreateChecklist,
}: TaskModalSidebarProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false)
  const [isPriorityOpen, setIsPriorityOpen] = useState(false)
  const [isSizeOpen, setIsSizeOpen] = useState(false)
  const [isCoverOpen, setIsCoverOpen] = useState(false)
  const [coverUrl, setCoverUrl] = useState('')

  const startDateTriggerRef = useRef<HTMLButtonElement>(null)
  const dueDateTriggerRef = useRef<HTMLButtonElement>(null)
  const priorityTriggerRef = useRef<HTMLButtonElement>(null)
  const sizeTriggerRef = useRef<HTMLButtonElement>(null)
  const coverTriggerRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="flex w-[320px] min-w-0 shrink-0 flex-col gap-6 overflow-y-auto bg-hover p-8">
      {/* Dates Section */}
      <div className="flex flex-col gap-3">
        <h3 className="m-0 flex items-center gap-1.5 font-heading text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
          <Calendar size={14} /> Dates
        </h3>
        <div className="flex flex-col gap-2">
          <button
            ref={startDateTriggerRef}
            className="flex cursor-pointer items-center justify-between border border-black bg-white p-3 text-left shadow-brutal-sm"
            onClick={() => setIsStartDatePickerOpen(prev => !prev)}
          >
            <span className="text-[11px] font-bold text-text-subtle uppercase">Start</span>
            <span className="font-body text-[13px] font-bold text-black">
              {card.startDate ? (
                format(new Date(card.startDate), 'MMM d, yyyy')
              ) : (
                <span className="text-text-subtle">+ Add</span>
              )}
            </span>
          </button>

          <button
            ref={dueDateTriggerRef}
            className="flex cursor-pointer items-center justify-between border border-black bg-white p-3 text-left shadow-brutal-sm"
            onClick={() => setIsDatePickerOpen(prev => !prev)}
          >
            <span className="text-[11px] font-bold text-text-subtle uppercase">Due</span>
            <div className="flex items-center gap-2">
              <span className="font-body text-[13px] font-bold text-black">
                {card.dueDate ? (
                  format(new Date(card.dueDate), 'MMM d, yyyy')
                ) : (
                  <span className="text-text-subtle">+ Add</span>
                )}
              </span>
              {card.dueDate && new Date(card.dueDate) < new Date() && (
                <span className="border border-black bg-[#E74C3C] px-1.5 py-0.5 text-[9px] font-extrabold text-white uppercase shadow-brutal-sm">
                  Overdue
                </span>
              )}
            </div>
          </button>

          <div className="flex items-center justify-between border border-black bg-white p-3 shadow-brutal-sm">
            <span className="text-[11px] font-bold text-text-subtle uppercase">Reminder</span>
            <ReminderSelect
              value={card.reminder}
              onChange={reminder => onUpdateCard({ reminder })}
              disabled={!card.dueDate}
              compact
            />
          </div>
        </div>
      </div>

      <Popover
        isOpen={isStartDatePickerOpen}
        onClose={() => setIsStartDatePickerOpen(false)}
        triggerRef={startDateTriggerRef}
        title="Start Date"
      >
        <DatePicker
          label="Start Date"
          initialDate={card.startDate}
          onSave={date => {
            onUpdateCard({ startDate: date })
            setIsStartDatePickerOpen(false)
          }}
        />
      </Popover>

      <Popover
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        triggerRef={dueDateTriggerRef}
        title="Due Date"
      >
        <DatePicker
          label="Due Date"
          initialDate={card.dueDate}
          onSave={date => {
            onUpdateCard({ dueDate: date })
            setIsDatePickerOpen(false)
          }}
        />
      </Popover>

      {/* Add to Card Section */}
      <div className="flex flex-col gap-3">
        <h3 className="m-0 flex items-center gap-1.5 font-heading text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
          Add to card
        </h3>
        <div className="flex flex-col gap-2">
          <ChecklistCreator onCreate={onCreateChecklist} />

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setIsPriorityOpen(prev => !prev)}
            ref={priorityTriggerRef}
          >
            <Flag size={14} /> Priority
          </Button>
          <Popover
            isOpen={isPriorityOpen}
            onClose={() => setIsPriorityOpen(false)}
            triggerRef={priorityTriggerRef}
            title="Priority"
          >
            <div className="flex flex-col gap-1">
              {PRIORITIES.map(p => (
                <button
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-2.5 border border-black bg-white p-2 px-3 text-left font-body text-[13px] font-bold transition-all ${card.priority === p.id ? 'shadow-inner-brutal bg-active' : 'hover:bg-hover'}`}
                  onClick={() => {
                    onUpdateCard({ priority: p.id as Card['priority'] })
                    setIsPriorityOpen(false)
                  }}
                >
                  <span
                    className="h-3 w-3 border border-black"
                    style={{ backgroundColor: p.color }}
                  />
                  {p.name}
                </button>
              ))}
            </div>
          </Popover>

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setIsSizeOpen(prev => !prev)}
            ref={sizeTriggerRef}
          >
            <Scaling size={14} /> Size
          </Button>
          <Popover
            isOpen={isSizeOpen}
            onClose={() => setIsSizeOpen(false)}
            triggerRef={sizeTriggerRef}
            title="Size"
          >
            <div className="flex flex-col gap-1">
              <button
                className={`flex cursor-pointer items-center gap-2.5 border border-black bg-white p-2 px-3 text-left font-body text-[13px] font-bold transition-all ${card.size === null ? 'shadow-inner-brutal bg-active' : 'hover:bg-hover'}`}
                onClick={() => {
                  onUpdateCard({ size: null })
                  setIsSizeOpen(false)
                }}
              >
                <span className="h-3 w-3 border border-black bg-gray-200" />
                None
              </button>
              {SIZES.map(s => (
                <button
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-2.5 border border-black bg-white p-2 px-3 text-left font-body text-[13px] font-bold transition-all ${card.size === s.id ? 'shadow-inner-brutal bg-active' : 'hover:bg-hover'}`}
                  onClick={() => {
                    onUpdateCard({ size: s.id as Card['size'] })
                    setIsSizeOpen(false)
                  }}
                >
                  <span className="h-3 w-3 border border-black bg-gray-400" />
                  {s.name}
                </button>
              ))}
            </div>
          </Popover>

          <Button
            ref={coverTriggerRef}
            variant="secondary"
            fullWidth
            onClick={() => {
              setCoverUrl(card.coverImageUrl || '')
              setIsCoverOpen(prev => !prev)
            }}
          >
            <Image size={14} /> Cover
          </Button>

          <Popover
            isOpen={isCoverOpen}
            onClose={() => setIsCoverOpen(false)}
            triggerRef={coverTriggerRef}
            title="Card Cover"
          >
            <div className="flex min-w-70 flex-col p-1">
              <Input
                placeholder="Enter image URL..."
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onUpdateCard({ coverImageUrl: coverUrl })
                    setIsCoverOpen(false)
                  }
                }}
                autoFocus
              />
              <div className="mt-3 flex gap-2">
                <Button
                  fullWidth
                  onClick={() => {
                    onUpdateCard({ coverImageUrl: coverUrl })
                    setIsCoverOpen(false)
                  }}
                >
                  Save
                </Button>
                {card.coverImageUrl && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      onUpdateCard({ coverImageUrl: null })
                      setCoverUrl('')
                      setIsCoverOpen(false)
                    }}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </Popover>
        </div>
      </div>

      {/* Assignees */}
      <TaskAssignees
        taskId={taskId}
        boardId={boardId}
        currentAssignees={card.assignees || []}
      />

      {/* Details */}
      <div className="flex flex-col gap-4">
        <h3 className="m-0 flex items-center gap-1.5 font-heading text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
          Details
        </h3>
        <div className="grid grid-cols-3 gap-4 border border-black bg-white p-4 shadow-brutal-sm">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-text-subtle uppercase">Position</span>
            <span className="text-[13px] font-extrabold text-black">{card.position}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-text-subtle uppercase">Priority</span>
            <span
              className="text-[13px] font-extrabold text-black"
              style={{
                color: PRIORITIES.find(p => p.id === card.priority)?.color || 'inherit',
              }}
            >
              {card.priority || 'none'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-extrabold text-text-subtle uppercase">Size</span>
            <span className="text-[13px] font-extrabold text-black">
              {SIZES.find(s => s.id === card.size)?.name || 'None'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
