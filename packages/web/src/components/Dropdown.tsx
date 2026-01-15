import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type DropdownItem = {
  label: string
  icon?: ReactNode
  onClick: () => void
  variant?: 'default' | 'danger'
}

type DropdownProps = {
  trigger: ReactNode
  items: DropdownItem[]
  position?: 'bottom-left' | 'bottom-right'
  onOpenChange?: (open: boolean) => void
}

export function Dropdown({ trigger, items, position = 'bottom-right', onOpenChange }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [isReady, setIsReady] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !isOpen
    setIsOpen(next)
    onOpenChange?.(next)
  }

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(false)
    }
  }, [isOpen])

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setCoords({
          top: rect.bottom + window.scrollY + 5,
          left: position === 'bottom-right' ? rect.right + window.scrollX - 200 : rect.left + window.scrollX,
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
  }, [isOpen, position])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        onOpenChange?.(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        onOpenChange?.(false)
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
    <div className="inline-flex relative" ref={triggerRef}>
      <div onClick={toggle} className="flex items-center justify-center">
        {trigger}
      </div>
      {isOpen && createPortal(
        <div 
          className={`absolute z-10000 bg-surface border-2 border-black shadow-brutal-md min-w-[200px] p-1 rounded-none transition-opacity duration-100 ${position}`}
          ref={menuRef}
          style={{ 
            top: coords.top, 
            left: coords.left,
            position: 'absolute',
            visibility: isReady ? 'visible' : 'hidden',
            opacity: isReady ? 1 : 0,
            pointerEvents: isReady ? 'auto' : 'none'
          }}
          onClick={e => e.stopPropagation()}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={`p-2.5 cursor-pointer flex items-center gap-2.5 font-heading text-[13px] font-extrabold uppercase transition-all hover:bg-accent hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md ${item.variant === 'danger' ? 'text-text-danger hover:bg-text-danger hover:text-white' : 'text-black'}`}
              onClick={() => {
                item.onClick()
                setIsOpen(false)
                onOpenChange?.(false)
              }}
            >
              {item.icon && <span className="flex items-center shrink-0">{item.icon}</span>}
              <span className="flex-1">{item.label}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
