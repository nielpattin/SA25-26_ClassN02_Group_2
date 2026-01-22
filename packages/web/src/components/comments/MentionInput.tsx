import { useRef, useState } from 'react'
import { Textarea } from '../ui/Textarea'
import { MentionPicker } from './MentionPicker'
import type { BoardMember } from '../CardModalTypes'

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  members: BoardMember[]
  placeholder?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function MentionInput({
  value,
  onChange,
  members,
  placeholder,
  className,
  disabled,
  autoFocus
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerFilter, setPickerFilter] = useState('')
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const selectionStart = e.target.selectionStart
    const textBeforeCursor = newValue.slice(0, selectionStart)
    const lastAtSymbol = textBeforeCursor.lastIndexOf('@')

    if (lastAtSymbol !== -1) {
      // Check if there is space before @ or it's the start
      const charBeforeAt = lastAtSymbol > 0 ? textBeforeCursor[lastAtSymbol - 1] : ' '
      if (/\s/.test(charBeforeAt)) {
        const filterText = textBeforeCursor.slice(lastAtSymbol + 1)
        // If there's a space after @, close the picker
        if (/\s/.test(filterText)) {
          setPickerOpen(false)
        } else {
          setPickerFilter(filterText)
          setMentionStartIndex(lastAtSymbol)
          setPickerOpen(true)
          
          if (textareaRef.current) {
            setAnchorRect(textareaRef.current.getBoundingClientRect())
          }
        }
      } else {
        setPickerOpen(false)
      }
    } else {
      setPickerOpen(false)
    }
  }

  const handleSelectMember = (member: BoardMember) => {
    if (!textareaRef.current) return

    const before = value.slice(0, mentionStartIndex)
    const after = value.slice(textareaRef.current.selectionStart)
    const mention = `@[${member.userName}](${member.userId}) `
    const newValue = before + mention + after
    
    onChange(newValue)
    setPickerOpen(false)
    
    // Set focus back and move cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartIndex + mention.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (pickerOpen) {
      if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape', 'Tab'].includes(e.key)) {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault()
        }
        return
      }
    }

    if (e.key === 'Backspace') {
      const { selectionStart, selectionEnd } = e.currentTarget
      if (selectionStart === selectionEnd && selectionStart > 0) {
        const textBefore = value.slice(0, selectionStart)
        // Match @[Name](id)
        const match = textBefore.match(/@\[[^\]]+\]\([^)]+\)$/)
        if (match) {
          e.preventDefault()
          const newValue = value.slice(0, selectionStart - match[0].length) + value.slice(selectionStart)
          onChange(newValue)
          return
        }
      }
    }

    if (e.key === 'ArrowLeft') {
      const { selectionStart, selectionEnd } = e.currentTarget
      if (selectionStart === selectionEnd && selectionStart > 0) {
        const textBefore = value.slice(0, selectionStart)
        const match = textBefore.match(/@\[[^\]]+\]\([^)]+\)$/)
        if (match) {
          e.preventDefault()
          const newPos = selectionStart - match[0].length
          e.currentTarget.setSelectionRange(newPos, newPos)
        }
      }
    }

    if (e.key === 'ArrowRight') {
      const { selectionStart, selectionEnd } = e.currentTarget
      if (selectionStart === selectionEnd && selectionStart < value.length) {
        const textAfter = value.slice(selectionStart)
        const match = textAfter.match(/^@\[[^\]]+\]\([^)]+\)/)
        if (match) {
          e.preventDefault()
          const newPos = selectionStart + match[0].length
          e.currentTarget.setSelectionRange(newPos, newPos)
        }
      }
    }
  }

  return (
    <div className="relative w-full">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
        autoFocus={autoFocus}
      />
      <MentionPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectMember}
        members={members}
        filter={pickerFilter}
        anchorRect={anchorRect}
      />
    </div>
  )
}
