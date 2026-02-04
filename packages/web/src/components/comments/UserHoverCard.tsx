import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Avatar } from '../ui/Avatar'
import type { BoardMember } from '../CardModalTypes'

interface UserHoverCardProps {
  member: BoardMember
  anchorRect: DOMRect | null
  isOpen: boolean
}

const CARD_WIDTH = 240
const CARD_HEIGHT = 100
const GAP = 8
const MARGIN = 12

export function UserHoverCard({ member, anchorRect, isOpen }: UserHoverCardProps) {
  const position = useMemo(() => {
    if (!anchorRect) return null

    const windowWidth = window.innerWidth

    // Center horizontally relative to anchor
    const triggerCenter = anchorRect.left + anchorRect.width / 2
    let left = triggerCenter - CARD_WIDTH / 2

    // Clamp to viewport
    if (left < MARGIN) left = MARGIN
    if (left + CARD_WIDTH > windowWidth - MARGIN) {
      left = windowWidth - CARD_WIDTH - MARGIN
    }

    // Default to above, flip to below if no space
    const spaceAbove = anchorRect.top - MARGIN - GAP
    const shouldFlip = spaceAbove < CARD_HEIGHT

    const top = shouldFlip
      ? anchorRect.bottom + window.scrollY + GAP
      : anchorRect.top + window.scrollY - CARD_HEIGHT - GAP

    return { top, left }
  }, [anchorRect])

  if (!isOpen || !position) return null

  return createPortal(
    <div
      className="animate-in fade-in z-30000 flex h-[100px] w-[240px] flex-col border border-black bg-white p-4 shadow-brutal-md transition-opacity duration-150"
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="flex items-center gap-4">
        <Avatar
          src={member.userImage}
          fallback={member.userName || 'U'}
          size="lg"
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <span className="truncate font-heading text-[14px] font-extrabold tracking-tight text-black uppercase">
            {member.userName || 'Unknown User'}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="border border-black bg-accent px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-black uppercase">
              {member.role}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
