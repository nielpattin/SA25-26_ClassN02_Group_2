import React, { useLayoutEffect, useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface PopoverProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  triggerRef: React.RefObject<HTMLElement | null>
  title?: string
  matchTriggerWidth?: boolean
}

export function Popover({ isOpen, onClose, children, triggerRef, title, matchTriggerWidth }: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, maxHeight: 0, shouldFlip: false })
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
    
    // If we match width, we align left edges instead
    if (matchTriggerWidth) {
      left = t.left
    }
    
    // Safety buffer from screen edges
    const margin = 10
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    // Clamp to viewport if not matching width (if matching width, we assume trigger is visible and safe)
    if (!matchTriggerWidth) {
      if (left < margin) {
        left = margin
      } else if (left + p.width > windowWidth - margin) {
        left = windowWidth - p.width - margin
      }
    }

    // Check vertical space
    const gap = 8
    const spaceBelow = windowHeight - t.bottom - margin - gap
    const spaceAbove = t.top - margin - gap
    
    // Default to below, but flip if space is limited and there's more space above
    const shouldFlip = spaceBelow < 200 && spaceAbove > spaceBelow
    
    const top = shouldFlip 
      ? t.top + window.scrollY - gap 
      : t.bottom + window.scrollY + gap
      
    const maxHeight = shouldFlip ? spaceAbove : spaceBelow

    setCoords({
      top,
      left: left + window.scrollX,
      width: t.width,
      maxHeight,
      shouldFlip
    })
    setIsReady(true)
  }, [isOpen, triggerRef, matchTriggerWidth])

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
      className="shadow-brutal-md overscroll-behavior-contain z-20000 flex min-w-70 flex-col rounded-none border border-black bg-white transition-opacity duration-100" 
      ref={popoverRef} 
      style={{ 
        top: `${coords.top}px`, 
        left: `${coords.left}px`,
        width: matchTriggerWidth ? `${coords.width}px` : undefined,
        maxHeight: `${coords.maxHeight}px`,
        transform: coords.shouldFlip ? 'translateY(-100%)' : undefined,
        position: 'absolute',
        visibility: isReady ? 'visible' : 'hidden',
        opacity: isReady ? 1 : 0,
        pointerEvents: isReady ? 'auto' : 'none',
      }}
    >
      {title && (
        <div className="flex shrink-0 items-center justify-between border-b border-black bg-white px-4 py-3">
          <span className="font-heading text-[12px] font-extrabold tracking-widest text-black uppercase">{title}</span>
          <button className="hover:text-accent cursor-pointer border-none bg-transparent p-1 text-xl leading-none font-extrabold text-black" onClick={onClose}>&times;</button>
        </div>
      )}
      <div className="overflow-y-auto p-4">
        {children}
      </div>
    </div>,
    document.body
  )
}
