import { useState, useRef, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface FilterDropdownProps {
  trigger: ReactNode
  children: ReactNode
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function FilterDropdown({ trigger, children, isOpen, onOpenChange }: FilterDropdownProps) {
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [isReady, setIsReady] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Reset isReady when dropdown closes - use lastIsOpen pattern to avoid effect lint error
  const [lastIsOpen, setLastIsOpen] = useState(isOpen)
  if (isOpen !== lastIsOpen) {
    setLastIsOpen(isOpen)
    if (!isOpen) {
      setIsReady(false)
    }
  }

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setCoords({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        })
        setIsReady(true)
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onOpenChange])

  return (
    <div className="relative inline-flex" ref={triggerRef}>
      <div
        onClick={() => onOpenChange(!isOpen)}
        className="flex cursor-pointer items-center justify-center"
      >
        {trigger}
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className="absolute z-10000 min-w-[200px] border border-black bg-surface p-2 shadow-brutal-md transition-opacity duration-100"
            style={{
              top: coords.top,
              left: coords.left,
              position: 'absolute',
              visibility: isReady ? 'visible' : 'hidden',
              opacity: isReady ? 1 : 0,
              pointerEvents: isReady ? 'auto' : 'none',
            }}
            onClick={e => e.stopPropagation()}
          >
            {children}
          </div>,
          document.body
        )}
    </div>
  )
}
