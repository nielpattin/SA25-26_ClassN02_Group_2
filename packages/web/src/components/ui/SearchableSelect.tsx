import { useState, useRef, useMemo } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { Popover } from './Popover'

type Option = {
  id: string
  name: string
  badge?: string
}

interface SearchableSelectProps {
  value: string
  options: Option[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}

export function SearchableSelect({ 
  value, 
  options, 
  onChange, 
  placeholder = 'Select option...', 
  searchPlaceholder = 'Search...',
  className = '' 
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLButtonElement>(null)
  
  const selectedOption = options.find(o => o.id === value)

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const s = search.toLowerCase()
    return options.filter(o => 
      o.name.toLowerCase().includes(s) || 
      o.id.toLowerCase().includes(s)
    )
  }, [options, search])

  return (
    <div className={`relative w-full ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between rounded-none border border-black bg-white px-3 py-2.5 text-left font-body text-[13px] font-bold text-black shadow-brutal-sm transition-all outline-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="truncate">{selectedOption?.name || placeholder}</span>
          {selectedOption?.badge && (
            <span className="shrink-0 border border-black bg-black px-1.5 py-0.5 text-[10px] font-bold text-white uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <Popover
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          setSearch('')
        }}
        triggerRef={triggerRef}
        matchTriggerWidth
      >
        <div className="-m-4 flex flex-col bg-white">
          <div className="border-b border-black bg-white p-2">
            <div className="relative flex items-center">
              <Search className="absolute left-3 text-black/40" size={14} />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-none border border-black bg-white py-2 pr-3 pl-9 font-body text-[12px] font-bold transition-all outline-none focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-[10px] font-bold text-black/40 uppercase">
                No results found
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onChange(option.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`group flex w-full items-center justify-between border border-transparent px-3 py-2 text-left font-body text-[12px] font-bold transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-black hover:bg-accent hover:shadow-brutal-sm ${value === option.id ? 'shadow-inner-brutal border-black bg-active' : 'bg-white'}`}
                >
                  <span className="truncate">{option.name}</span>
                  {option.badge && (
                    <span className={`shrink-0 border border-black px-1.5 py-0.5 text-[9px] font-bold uppercase transition-colors ${value === option.id ? 'bg-black text-white' : 'bg-white text-black group-hover:bg-black group-hover:text-white'}`}>
                      {option.badge}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </Popover>
    </div>
  )
}
