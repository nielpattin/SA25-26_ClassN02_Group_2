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
        className="w-full bg-white border-2 border-black px-3 py-2.5 font-body text-[13px] font-bold text-black outline-none rounded-none text-left flex items-center justify-between transition-all shadow-brutal-sm hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5"
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
        <div className="flex flex-col gap-1 -m-4 p-1 max-h-60 overflow-y-auto bg-white">
          {options.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id)
                setIsOpen(false)
              }}
              className={`w-full text-left px-3 py-2 font-body text-[13px] font-bold transition-all border-2 border-transparent hover:border-black hover:bg-accent hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm ${value === option.id ? 'bg-[#EEEEEE] border-black shadow-inner-brutal' : 'bg-white'}`}
            >
              {option.name}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  )
}
