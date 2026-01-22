import { memo, useRef, useLayoutEffect, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { Dropdown, type DropdownItem } from '../ui/Dropdown'

export type ColumnHeaderProps = {
  name: string
  cardCount: number
  menuItems: DropdownItem[]
  onDragStart: (e: React.MouseEvent) => void
  onRename: (newName: string) => void
}

export const ColumnHeader = memo(function ColumnHeader({
  name,
  cardCount,
  menuItems,
  onDragStart,
  onRename,
}: ColumnHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [nameValue, setNameValue] = useState(name)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (isEditing) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [isEditing])

  const handleRenameSubmit = () => {
    if (nameValue.trim() && nameValue.trim() !== name) {
      onRename(nameValue.trim())
    } else {
      setNameValue(name)
    }
    setIsEditing(false)
  }

  const startEditing = () => {
    setNameValue(name)
    setIsEditing(true)
  }

  return (
    <h4
      className="font-heading relative mb-5 flex shrink-0 cursor-grab items-center gap-2.5 border-b border-black p-2 text-(length:--column-header-size,14px) font-extrabold tracking-widest text-black uppercase"
      onMouseDown={onDragStart}
      data-role="column-header"
    >
      {isEditing ? (
        <input
          ref={nameInputRef}
          className="font-inherit tracking-inherit m-0 w-full flex-1 border-none bg-transparent p-0 text-inherit uppercase outline-none"
          value={nameValue}
          onChange={e => setNameValue(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRenameSubmit()
            if (e.key === 'Escape') {
              setNameValue(name)
              setIsEditing(false)
            }
          }}
          onMouseDown={e => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 cursor-text truncate"
          onClick={e => {
            e.stopPropagation()
            startEditing()
          }}
        >
          {name}
        </span>
      )}
      <span className="bg-accent ml-auto border border-black px-2 py-0.5 text-[11px] font-extrabold">
        {cardCount}
      </span>
      <div onMouseDown={e => e.stopPropagation()} className="flex items-center">
        <Dropdown
          trigger={
            <MoreHorizontal
              size={14}
              className={`cursor-pointer ${isMenuOpen ? 'text-black' : 'text-text-muted'}`}
            />
          }
          items={menuItems}
          onOpenChange={setIsMenuOpen}
        />
      </div>
    </h4>
  )
})

ColumnHeader.displayName = 'ColumnHeader'
