import { useCallback } from 'react'
import { useDragRefs } from './dragTypes'
import { useDragStore, type DraggableItem } from '../../store/dragStore'

export function usePendingDrag(onDragStart?: () => void) {
  const { pendingCardDragRef, pendingColumnDragRef, lastDropTargetRef } = useDragRefs()
  const { scrollContainerRef, columnRectsRef } = useDragRefs()

  const setDraggedCardId = useDragStore((s) => s.setDraggedCardId)
  const setDraggedCardData = useDragStore((s) => s.setDraggedCardData)
  const setDraggedWidth = useDragStore((s) => s.setDraggedWidth)
  const setDraggedHeight = useDragStore((s) => s.setDraggedHeight)
  const setDragOffset = useDragStore((s) => s.setDragOffset)
  const setDropTarget = useDragStore((s) => s.setDropTarget)
  const setDragSourceColumnId = useDragStore((s) => s.setDragSourceColumnId)
  const setLocalColumns = useDragStore((s) => s.setLocalColumns)
  const setDraggedColumnId = useDragStore((s) => s.setDraggedColumnId)
  const setPlaceholderIndex = useDragStore((s) => s.setPlaceholderIndex)
  const { isDraggingCardRef } = useDragRefs()

  const cacheColumnRects = useCallback(() => {
    if (!scrollContainerRef.current) return
    const cols = Array.from(
      scrollContainerRef.current.querySelectorAll('[data-role="column"]')
    )
    columnRectsRef.current = cols.map(col => {
      const r = col.getBoundingClientRect()
      const columnId = (col as HTMLElement).dataset.columnId ?? ''
      return {
        id: columnId,
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
      }
    })
  }, [scrollContainerRef, columnRectsRef])

  const activateCardDrag = useCallback(<TCard extends DraggableItem>(
    e: React.MouseEvent,
    allCards: TCard[]
  ) => {
    if (!pendingCardDragRef.current) return false

    const { x, y, item: card, rect, width, height } = pendingCardDragRef.current
    const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))

    if (dist <= 5) return false

    cacheColumnRects()

    setDraggedCardId(card.id)
    setDraggedCardData(card)
    setDraggedWidth(width)
    setDraggedHeight(height)
    setDragOffset({ x: x - rect.left, y: y - rect.top })

    const cardWithCol = card as TCard & { columnId: string }
    const colCards = allCards.filter(
      c => (c as TCard & { columnId: string }).columnId === cardWithCol.columnId
    )
    const myIdx = colCards.findIndex(c => c.id === card.id)
    const initialInsertBeforeId = myIdx !== -1 && myIdx < colCards.length - 1
      ? colCards[myIdx + 1].id
      : null

    setDropTarget({ columnId: cardWithCol.columnId, insertBeforeId: initialInsertBeforeId })
    setDragSourceColumnId(cardWithCol.columnId)
    lastDropTargetRef.current = { columnId: cardWithCol.columnId, insertBeforeId: initialInsertBeforeId }

    onDragStart?.()
    isDraggingCardRef.current = true
    pendingCardDragRef.current = null

    return true
  }, [
    pendingCardDragRef, cacheColumnRects, setDraggedCardId, setDraggedCardData,
    setDraggedWidth, setDraggedHeight, setDragOffset, setDropTarget,
    setDragSourceColumnId, lastDropTargetRef, onDragStart, isDraggingCardRef,
  ])

  const activateColumnDrag = useCallback(<TColumn extends DraggableItem>(
    e: React.MouseEvent,
    serverColumns: TColumn[]
  ) => {
    if (!pendingColumnDragRef.current) return false

    const { x, y, columnId, rect, width, height } = pendingColumnDragRef.current
    const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))

    if (dist <= 5) return false

    cacheColumnRects()

    setLocalColumns(serverColumns as DraggableItem[])
    setDraggedColumnId(columnId)
    setDraggedWidth(width)
    setDraggedHeight(height)
    setDragOffset({ x: x - rect.left, y: y - rect.top })

    onDragStart?.()

    const index = serverColumns.findIndex(c => c.id === columnId)
    setPlaceholderIndex(index)
    pendingColumnDragRef.current = null

    return true
  }, [
    pendingColumnDragRef, cacheColumnRects, setLocalColumns, setDraggedColumnId,
    setDraggedWidth, setDraggedHeight, setDragOffset, onDragStart, setPlaceholderIndex,
  ])

  return { activateCardDrag, activateColumnDrag }
}
