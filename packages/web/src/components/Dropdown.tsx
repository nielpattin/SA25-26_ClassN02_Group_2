import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './Dropdown.css'

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
}

export function Dropdown({ trigger, items, position = 'bottom-right' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + window.scrollY + 5,
        left: position === 'bottom-right' ? rect.right - 200 : rect.left,
      })
    }
    setIsOpen(!isOpen)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
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
  }, [isOpen])

  return (
    <div className="dropdown-container" ref={triggerRef} onMouseDown={handleMouseDown}>
      <div onClick={toggle} className="dropdown-trigger">
        {trigger}
      </div>
      {isOpen && createPortal(
        <div 
          className={`dropdown-menu ${position}`}
          ref={menuRef}
          style={{ top: coords.top, left: coords.left }}
          onClick={e => e.stopPropagation()}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={`dropdown-item ${item.variant || 'default'}`}
              onClick={() => {
                item.onClick()
                setIsOpen(false)
              }}
            >
              {item.icon && <span className="dropdown-item-icon">{item.icon}</span>}
              <span className="dropdown-item-label">{item.label}</span>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
