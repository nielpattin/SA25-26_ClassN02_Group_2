import { X, Move, MoreHorizontal, Archive } from 'lucide-react'
import { Input } from '../ui/Input'
import { Dropdown } from '../ui/Dropdown'
import type { Card } from '../CardModalTypes'

interface TaskModalHeaderProps {
  card: Card
  onUpdateTitle: (title: string) => void
  onMove: () => void
  onArchive: () => void
  onClose: () => void
  onRemoveCover: () => void
}

export function TaskModalHeader({
  card,
  onUpdateTitle,
  onMove,
  onArchive,
  onClose,
  onRemoveCover,
}: TaskModalHeaderProps) {
  const menuItems = [
    { label: 'Move', icon: <Move size={14} />, onClick: onMove },
    { label: 'Archive', icon: <Archive size={14} />, onClick: onArchive },
  ]

  return (
    <>
      {card.coverImageUrl && (
        <div className="relative h-50 w-full shrink-0 overflow-hidden border-b border-black bg-active">
          <img src={card.coverImageUrl} alt="Cover" className="h-full w-full object-cover" />
          <button
            className="absolute top-3 right-3 flex cursor-pointer items-center justify-center border border-white bg-black p-2 text-white hover:bg-[#E74C3C]"
            onClick={onRemoveCover}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex h-16 shrink-0 items-center justify-between border-b border-black">
        <div className="min-w-0 flex-1 pl-4">
          <Input
            value={card.title}
            onChange={e => onUpdateTitle(e.target.value)}
            className="h-full border-none bg-transparent p-0 font-heading text-[20px] font-extrabold uppercase"
            brutal={false}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 pr-4">
          <Dropdown
            trigger={
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center border border-black bg-white text-black transition-all hover:-translate-0.5 hover:bg-accent hover:shadow-brutal-sm active:translate-0 active:shadow-none">
                <MoreHorizontal size={18} />
              </button>
            }
            items={menuItems}
          />
          <button
            className="flex h-10 w-10 cursor-pointer items-center justify-center border border-black bg-white text-black transition-all hover:-translate-0.5 hover:bg-text-danger hover:text-white hover:shadow-brutal-sm active:translate-0 active:shadow-none"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </>
  )
}
