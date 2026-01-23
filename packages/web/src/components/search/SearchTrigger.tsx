import { Search, Command } from 'lucide-react'
import { useSearchModal } from '../../context/SearchContext'

export function SearchTrigger() {
  const { open } = useSearchModal()

  return (
    <button
      onClick={open}
      className="flex items-center gap-2 border border-black bg-white px-3 py-2 text-xs font-bold uppercase transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
    >
      <Search size={14} />
      <span>Search</span>
      <div className="flex items-center gap-0.5 border-l border-black/20 pl-2 text-[10px] text-black/50">
        <Command size={10} />
        <span>K</span>
      </div>
    </button>
  )
}
