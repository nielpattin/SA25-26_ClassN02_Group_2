import React, { useLayoutEffect, useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './Popover.css'

interface PopoverProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  triggerRef: React.RefObject<HTMLElement | null>
  title?: string
}

export function Popover({ isOpen, onClose, children, triggerRef, title }: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const [isReady, setIsReady] = useState(false)

  // Reset state when popover closes or trigger changes
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(false)
    }
  }, [isOpen, triggerRef])

  const updatePosition = useCallback(() => {
    if (!isOpen || !triggerRef.current || !popoverRef.current) return

    const t = triggerRef.current.getBoundingClientRect()
    const p = popoverRef.current.getBoundingClientRect()
    
    // We want the popover's horizontal center to align with the trigger's horizontal center.
    const triggerCenter = t.left + (t.width / 2)
    let left = triggerCenter - (p.width / 2)
    
    // Safety buffer from screen edges
    const margin = 10
    const windowWidth = window.innerWidth
    
    // Clamp to viewport
    if (left < margin) {
      left = margin
    } else if (left + p.width > windowWidth - margin) {
      left = windowWidth - p.width - margin
    }

    setCoords({
      top: t.bottom + window.scrollY + 8,
      left: left + window.scrollX
    })
    setIsReady(true)
  }, [isOpen, triggerRef])

  useLayoutEffect(() => {
    if (!isOpen) return

    // Initial calculation
    updatePosition()

    // Handle dynamic changes
    const resizeObserver = new ResizeObserver(() => {
      updatePosition()
    })
    
    if (popoverRef.current) {
      resizeObserver.observe(popoverRef.current)
    }

    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen, updatePosition])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  return createPortal(
    <div 
      className="brutal-popover" 
      ref={popoverRef} 
      style={{ 
        top: `${coords.top}px`, 
        left: `${coords.left}px`,
        position: 'absolute',
        visibility: isReady ? 'visible' : 'hidden',
        opacity: isReady ? 1 : 0,
        pointerEvents: isReady ? 'auto' : 'none',
        zIndex: 2000
      }}
    >
      {title && (
        <div className="popover-header">
          <span className="popover-title">{title}</span>
          <button className="popover-close" onClick={onClose}>&times;</button>
        </div>
      )}
      <div className="popover-content">
        {children}
      </div>
    </div>,
    document.body
  )
}
