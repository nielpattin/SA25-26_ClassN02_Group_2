import { useState, useRef, type ReactNode } from 'react'
import { UserHoverCard } from './UserHoverCard'
import type { BoardMember } from '../CardModalTypes'

interface MentionRendererProps {
  content: string
  members?: BoardMember[]
}

function MentionLink({ 
  name, 
  member 
}: { 
  name: string
  member?: BoardMember 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const timerRef = useRef<number | null>(null)
  const spanRef = useRef<HTMLSpanElement>(null)

  const handleMouseEnter = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      if (spanRef.current) {
        setAnchorRect(spanRef.current.getBoundingClientRect())
        setIsOpen(true)
      }
    }, 200)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setIsOpen(false)
  }

  return (
    <>
      <span
        ref={spanRef}
        className="cursor-pointer rounded px-0.5 font-semibold text-[#3498DB] transition-colors hover:bg-[#3498DB]/10"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        @{name}
      </span>
      {member && (
        <UserHoverCard
          member={member}
          anchorRect={anchorRect}
          isOpen={isOpen}
        />
      )}
    </>
  )
}

/**
 * Parses and renders mentions in the format @[Name](userId)
 * Applied styles: blue text, semibold, slight background on hover
 */
export function MentionRenderer({ content, members = [] }: MentionRendererProps) {
  if (!content) return null

  // Regex to match @[Name](id)
  // [0] = full match, [2] = Name, [3] = id
  const regex = /(@\[([^\]]+)\]\(([^)]+)\))/g
  
  const parts: (string | ReactNode)[] = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    const fullMatch = match[0]
    const name = match[2]
    const id = match[3]
    const index = match.index

    // Add text before the match
    if (index > lastIndex) {
      parts.push(content.slice(lastIndex, index))
    }

    const member = members.find(m => m.userId === id)

    // Add the styled mention
    parts.push(
      <MentionLink
        key={`${id}-${index}`}
        name={name}
        member={member}
      />
    )

    lastIndex = index + fullMatch.length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  return (
    <div className="wrap-break-word whitespace-pre-wrap">
      {parts.length > 0 ? parts : content}
    </div>
  )
}
