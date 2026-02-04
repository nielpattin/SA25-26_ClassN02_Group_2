import { useCallback, useLayoutEffect } from 'react'
import { useDragContext, type DraggableItem } from '../components/dnd/dragTypes'

export type CalendarDropResult = {
  cardId: string
  newDate: string
}

export function useCalendarDragHandlers(onDrop: (result: CalendarDropResult) => void) {
  const {
    draggedCardId,
    setDraggedCardId,
    setDraggedCardData,
    dragOffset,
    setDragOffset,
    setDraggedHeight,
    cardGhostRef,
    lastMousePosRef,
    pendingCardDragRef,
  } = useDragContext()

  useLayoutEffect(() => {
    if (draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${lastMousePosRef.current.x - dragOffset.x}px, ${lastMousePosRef.current.y - dragOffset.y}px, 0)`
    }
  }, [draggedCardId, dragOffset, cardGhostRef, lastMousePosRef])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    lastMousePosRef.current = { x: e.clientX, y: e.clientY }

    if (pendingCardDragRef.current) {
      const { x, y, item: card, rect, height } = pendingCardDragRef.current
      const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))

      if (dist > 5) {
        setDraggedCardId(card.id)
        setDraggedCardData(card)
        setDraggedHeight(height)
        setDragOffset({
          x: x - rect.left,
          y: y - rect.top,
        })
        pendingCardDragRef.current = null
      }
    }

    if (draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0)`
    }
  }, [draggedCardId, dragOffset, pendingCardDragRef, setDraggedCardId, setDraggedCardData, setDraggedHeight, setDragOffset, cardGhostRef, lastMousePosRef])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggedCardId) {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
      const dayCell = target?.closest('[data-role="day-cell"]') as HTMLElement
      
      if (dayCell) {
        const newDate = dayCell.dataset.date
        if (newDate) {
          onDrop({ cardId: draggedCardId, newDate })
        }
      }
      
      setDraggedCardId(null)
      setDraggedCardData(null)
    }
    pendingCardDragRef.current = null
  }, [draggedCardId, onDrop, setDraggedCardId, setDraggedCardData, pendingCardDragRef])

  const handleCardDragStart = useCallback((card: DraggableItem, e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    pendingCardDragRef.current = {
      item: card,
      x: e.clientX,
      y: e.clientY,
      rect,
      width: rect.width,
      height: rect.height,
    }
  }, [pendingCardDragRef])

  return {
    handleMouseMove,
    handleMouseUp,
    handleCardDragStart,
  }
}
