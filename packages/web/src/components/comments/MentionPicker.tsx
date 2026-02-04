import { useRef, useEffect, useMemo, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from '../ui/Avatar'
import type { BoardMember } from '../CardModalTypes'

interface MentionPickerProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (member: BoardMember) => void
  members: BoardMember[]
  filter: string
  anchorRect: DOMRect | null
}

const PICKER_MAX_HEIGHT = 256
const GAP = 4
const MARGIN = 10

export function MentionPicker({
  isOpen,
  onClose,
  onSelect,
  members,
  filter,
  anchorRect,
}: MentionPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const filteredMembers = useMemo(() => {
    if (!filter) return members
    const search = filter.toLowerCase()
    return members.filter(m =>
      m.userName?.toLowerCase().includes(search)
    )
  }, [members, filter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedIndex(0)
  }, [filter])

  const position = useMemo(() => {
    if (!anchorRect) return null

    const windowHeight = window.innerHeight
    const spaceBelow = windowHeight - anchorRect.bottom - MARGIN - GAP
    const spaceAbove = anchorRect.top - MARGIN - GAP
    const shouldFlip = spaceBelow < PICKER_MAX_HEIGHT && spaceAbove > spaceBelow

    let left = anchorRect.left + window.scrollX
    const maxLeft = window.innerWidth - 224 - MARGIN
    if (left > maxLeft) left = maxLeft
    if (left < MARGIN) left = MARGIN

    const top = shouldFlip
      ? anchorRect.top + window.scrollY - PICKER_MAX_HEIGHT - GAP
      : anchorRect.bottom + window.scrollY + GAP

    return { top, left }
  }, [anchorRect])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredMembers.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredMembers[selectedIndex]) {
          onSelect(filteredMembers[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      case 'Tab':
        e.preventDefault()
        onClose()
        break
    }
  }, [isOpen, filteredMembers, selectedIndex, onSelect, onClose])

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

  useEffect(() => {
    const selected = pickerRef.current?.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen || !anchorRect || !position) return null

  return createPortal(
    <div
      ref={pickerRef}
      className="z-20000 flex max-h-64 min-w-56 flex-col overflow-hidden rounded-none border border-black bg-white shadow-brutal-md"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {filteredMembers.length === 0 ? (
        <div className="px-4 py-6 text-center text-[11px] font-bold text-black/40 uppercase">
          No members found
        </div>
      ) : (
        <div className="flex flex-col overflow-y-auto p-1">
          {filteredMembers.map((member, index) => (
            <button
              key={member.userId}
              type="button"
              data-selected={index === selectedIndex}
              onClick={() => onSelect(member)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex items-center gap-3 border border-transparent px-3 py-2 text-left font-body text-[12px] font-bold transition-all ${
                index === selectedIndex
                  ? '-translate-x-0.5 -translate-y-0.5 border-black bg-accent shadow-brutal-sm'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Avatar
                src={member.userImage}
                fallback={member.userName || 'U'}
                size="sm"
              />
              <div className="flex flex-1 flex-col overflow-hidden">
                <span className="truncate text-black">
                  {member.userName || 'Unknown User'}
                </span>
                <span className="text-[10px] font-semibold text-black/50 uppercase">
                  {member.role}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}
