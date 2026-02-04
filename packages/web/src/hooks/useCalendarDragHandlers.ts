import { useCallback, useLayoutEffect } from 'react'
import { useDragRefs, type DraggableItem } from '../components/dnd/dragTypes'
import { useDragStore } from '../store/dragStore'

export type CalendarDropResult = {
  cardId: string
  newDate: string
}

export function useCalendarDragHandlers(onDrop: (result: CalendarDropResult) => void) {
  const draggedCardId = useDragStore((s) => s.draggedCardId)
  const setDraggedCardId = useDragStore((s) => s.setDraggedCardId)
  const setDraggedCardData = useDragStore((s) => s.setDraggedCardData)
  const setDragOffset = useDragStore((s) => s.setDragOffset)
  const setDraggedHeight = useDragStore((s) => s.setDraggedHeight)

  const { cardGhostRef, lastMousePosRef, pendingCardDragRef } = useDragRefs()

  useLayoutEffect(() => {
    const dragOffset = useDragStore.getState().dragOffset
    if (draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${lastMousePosRef.current.x - dragOffset.x}px, ${lastMousePosRef.current.y - dragOffset.y}px, 0)`
    }
  }, [draggedCardId, cardGhostRef, lastMousePosRef])

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

    const state = useDragStore.getState()
    if (state.draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${e.clientX - state.dragOffset.x}px, ${e.clientY - state.dragOffset.y}px, 0)`
    }
  }, [pendingCardDragRef, setDraggedCardId, setDraggedCardData, setDraggedHeight, setDragOffset, cardGhostRef, lastMousePosRef])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const state = useDragStore.getState()
    if (state.draggedCardId) {
      const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement
      const dayCell = target?.closest('[data-role="day-cell"]') as HTMLElement
      
      if (dayCell) {
        const newDate = dayCell.dataset.date
        if (newDate) {
          onDrop({ cardId: state.draggedCardId, newDate })
        }
      }
      
      setDraggedCardId(null)
      setDraggedCardData(null)
    }
    pendingCardDragRef.current = null
  }, [onDrop, setDraggedCardId, setDraggedCardData, pendingCardDragRef])

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
