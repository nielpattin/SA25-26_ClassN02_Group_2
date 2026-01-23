import { Bell } from 'lucide-react'
import { Popover } from '../ui/Popover'
import { useRef, useState } from 'react'

const REMINDER_OPTIONS = [
  { id: 'none', name: 'None' },
  { id: 'on_day', name: 'On day of event' },
  { id: '1_day', name: '1 day before' },
  { id: '2_days', name: '2 days before' },
  { id: '1_week', name: '1 week before' },
] as const

type ReminderValue = typeof REMINDER_OPTIONS[number]['id']

interface ReminderSelectProps {
  value: ReminderValue
  onChange: (value: ReminderValue) => void
  disabled?: boolean
}

export function ReminderSelect({ value, onChange, disabled }: ReminderSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)

  const selectedOption = REMINDER_OPTIONS.find(opt => opt.id === value)

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`shadow-brutal-sm flex h-12 shrink-0 items-center justify-center border-2 border-black bg-white px-4 transition-all ${
          disabled
            ? 'cursor-not-allowed bg-[#F0F0F0] opacity-50'
            : 'hover:shadow-brutal-md cursor-pointer hover:-translate-y-0.5 active:translate-y-0 active:shadow-none'
        }`}
        title={disabled ? 'Set a due date first to enable reminders' : undefined}
      >
        <div className="flex items-center gap-3">
          <Bell
            size={16}
            strokeWidth={3}
            className={value !== 'none' ? 'text-black' : 'opacity-40'}
            fill={value !== 'none' ? 'currentColor' : 'none'}
          />
          <span className="font-body text-[14px] font-extrabold text-black uppercase">
            {selectedOption?.name || 'None'}
          </span>
        </div>
      </div>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        title="Reminder"
      >
        <div className="flex flex-col gap-1">
          {REMINDER_OPTIONS.map(opt => (
            <button
              key={opt.id}
              className={`font-body flex cursor-pointer items-center gap-2.5 border border-black bg-white p-2 px-3 text-left text-[13px] font-bold transition-all ${
                value === opt.id
                  ? 'shadow-inner-brutal bg-active'
                  : 'hover:shadow-brutal-md hover:-translate-0.5 hover:bg-[#F5F5F5]'
              }`}
              onClick={() => {
                onChange(opt.id)
                setIsOpen(false)
              }}
            >
              {opt.name}
            </button>
          ))}
        </div>
      </Popover>
    </>
  )
}
