import { useState, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { Popover } from './Popover'

type Option = {
  id: string
  name: string
}

interface SelectProps {
  value: string
  options: Option[]
  onChange: (value: string) => void
  className?: string
}

export function Select({ value, options, onChange, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectedOption = options.find(o => o.id === value)

  return (
    <div className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between rounded-none border border-black bg-white px-3 py-2.5 text-left font-body text-[13px] font-bold text-black shadow-brutal-sm transition-all outline-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md"
      >
        <span>{selectedOption?.name || 'Select option...'}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <Popover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        triggerRef={triggerRef}
        matchTriggerWidth
      >
        <div className="-m-4 flex max-h-60 flex-col gap-1 overflow-y-auto bg-white p-1">
          {options.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id)
                setIsOpen(false)
              }}
              className={`w-full border border-transparent px-3 py-2 text-left font-body text-[13px] font-bold transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-black hover:bg-accent hover:shadow-brutal-sm ${value === option.id ? 'shadow-inner-brutal border-black bg-active' : 'bg-white'}`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  )
}
