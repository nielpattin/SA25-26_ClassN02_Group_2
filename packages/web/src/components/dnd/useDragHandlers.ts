import { useCallback, useLayoutEffect } from 'react'
import { useDragContext, type DraggableItem } from './dragTypes'

export type ColumnDropResult<TColumn extends DraggableItem> = {
  columnId: string
  finalColumns: TColumn[]
  placeholderIndex: number
}

export type CardDropResult<TCard extends DraggableItem> = {
  cardId: string
  finalCards: TCard[]
  droppedCard: TCard
}

export type UseDragHandlersOptions<TColumn extends DraggableItem, TCard extends DraggableItem> = {
  serverColumns: TColumn[]
  allCards: TCard[]
  displayColumns: TColumn[]
  onDragStart?: () => void
  onDragEnd?: () => void
  onColumnDrop?: (result: ColumnDropResult<TColumn>) => void
  onCardDrop?: (result: CardDropResult<TCard>) => void
}

export type DragHandlers = {
  handleMouseDown: (e: React.MouseEvent) => void
  handleMouseMove: (e: React.MouseEvent) => void
  handleMouseUpOrLeave: () => void
  handleColumnDragStart: (e: React.MouseEvent) => void
  handleCardDragStart: (card: DraggableItem, e: React.MouseEvent) => void
}

export function useDragHandlers<
  TColumn extends DraggableItem,
  TCard extends DraggableItem,
>({
  serverColumns,
  allCards,
  displayColumns,
  onDragStart,
  onDragEnd,
  onColumnDrop,
  onCardDrop,
}: UseDragHandlersOptions<TColumn, TCard>): DragHandlers {
  const {
    draggedColumnId,
    setDraggedColumnId,
    localColumns,
    setLocalColumns,
    placeholderIndex,
    setPlaceholderIndex,
    draggedCardId,
    setDraggedCardId,
    setDraggedCardData,
    localCards,
    setLocalCards,
    dragOffset,
    setDragOffset,
    draggedWidth,
    setDraggedWidth,
    draggedHeight,
    setDraggedHeight,
    isScrolling,
    setIsScrolling,
    startX,
    setStartX,
    scrollLeft,
    setScrollLeft,
    scrollContainerRef,
    ghostRef,
    cardGhostRef,
    lastMousePos,
    dragDirection,
    columnRects,
    isDraggingCard,
    pendingCardDrag,
    pendingColumnDrag,
  } = useDragContext<TColumn, TCard>()

  // Update ghost position on drag state change
  useLayoutEffect(() => {
    if (draggedColumnId && ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${lastMousePos.current.x - dragOffset.x}px, ${lastMousePos.current.y - dragOffset.y}px, 0) rotate(2deg)`
    }
    if (draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${lastMousePos.current.x - dragOffset.x}px, ${lastMousePos.current.y - dragOffset.y}px, 0)`
    }
  }, [draggedColumnId, draggedCardId, dragOffset, ghostRef, cardGhostRef, lastMousePos])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!scrollContainerRef.current) return

      const target = e.target as HTMLElement
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[data-role="card"]') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[data-role="column-header"]')
      )
        return

      setIsScrolling(true)
      setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
      setScrollLeft(scrollContainerRef.current.scrollLeft)
    },
    [scrollContainerRef, setIsScrolling, setStartX, setScrollLeft]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const dx = e.clientX - lastMousePos.current.x
      const dy = e.clientY - lastMousePos.current.y
      if (dx !== 0) dragDirection.current.x = dx > 0 ? 1 : -1
      if (dy !== 0) dragDirection.current.y = dy > 0 ? 1 : -1

      lastMousePos.current = { x: e.clientX, y: e.clientY }

      // Handle pending card drag
      if (pendingCardDrag.current) {
        const { x, y, item: card, rect, width, height } = pendingCardDrag.current
        const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))

        if (dist > 5) {
          if (scrollContainerRef.current) {
            const cols = Array.from(
              scrollContainerRef.current.querySelectorAll('[data-role="column"]')
            )
            columnRects.current = cols.map(col => {
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
          }

          setLocalCards(allCards as TCard[])
          setDraggedCardId(card.id)
          setDraggedCardData(card as TCard)
          setDraggedWidth(width)
          setDraggedHeight(height)

          setDragOffset({
            x: x - rect.left,
            y: y - rect.top,
          })
          onDragStart?.()
          isDraggingCard.current = true
          pendingCardDrag.current = null
        }
      }

      // Handle pending column drag
      if (pendingColumnDrag.current) {
        const { x, y, columnId, rect, width, height } = pendingColumnDrag.current
        const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))

        if (dist > 5) {
          setLocalColumns(serverColumns as TColumn[])
          setDraggedColumnId(columnId)
          setDraggedWidth(width)
          setDraggedHeight(height)

          setDragOffset({
            x: x - rect.left,
            y: y - rect.top,
          })
          onDragStart?.()

          const index = serverColumns.findIndex(c => c.id === columnId)
          setPlaceholderIndex(index)
          pendingColumnDrag.current = null
        }
      }

      // Handle active column drag
      if (draggedColumnId) {
        if (ghostRef.current) {
          ghostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0) rotate(2deg)`
        }

        if (scrollContainerRef.current) {
          const colElements = Array.from(
            scrollContainerRef.current.querySelectorAll('[data-role="column"]')
          )
          const otherCols = colElements
            .map(el => ({
              id: (el as HTMLElement).dataset.columnId ?? '',
              rect: el.getBoundingClientRect(),
            }))
            .filter(c => c.id !== draggedColumnId)

          let newIndex = placeholderIndex ?? 0
          const draggedMidX = e.clientX - dragOffset.x + draggedWidth / 2

          for (let i = 0; i < otherCols.length; i++) {
            const { rect } = otherCols[i]
            const neighborMidX = rect.left + rect.width / 2

            if (draggedMidX > neighborMidX && i >= (placeholderIndex ?? 0)) {
              newIndex = i + 1
            } else if (draggedMidX < neighborMidX && i < (placeholderIndex ?? 0)) {
              newIndex = i
              break
            }
          }

          if (newIndex !== placeholderIndex) {
            setPlaceholderIndex(newIndex)

            setLocalColumns(prev => {
              const filtered = prev.filter(c => c.id !== draggedColumnId)
              const draggedCol = prev.find(c => c.id === draggedColumnId)
              if (!draggedCol) return prev
              const updated = [...filtered]
              updated.splice(newIndex, 0, draggedCol)
              return updated
            })
          }
        }
        return
      }

      // Handle active card drag
      if (draggedCardId) {
        if (cardGhostRef.current) {
          cardGhostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0)`
        }

        if (scrollContainerRef.current) {
          const colElements = Array.from(
            scrollContainerRef.current.querySelectorAll('[data-role="column"]')
          )
          const colRects = colElements.map(el => {
            const r = el.getBoundingClientRect()
            const columnId = (el as HTMLElement).dataset.columnId ?? ''
            return { id: columnId, left: r.left, right: r.right }
          })

          const hoveredCol = colRects.find(r => e.clientX >= r.left && e.clientX <= r.right)
          if (hoveredCol) {
            const targetColId = hoveredCol.id
            const cardElements = Array.from(
              scrollContainerRef.current.querySelectorAll(
                `[data-role="card-wrapper"][data-column-id="${targetColId}"]:not([data-state="placeholder"])`
              )
            )

            const rects = cardElements.map(el => {
              const r = el.getBoundingClientRect()
              return {
                id: (el as HTMLElement).dataset.cardId ?? '',
                top: r.top,
                bottom: r.bottom,
                height: r.height,
              }
            })

            const isMovingDown = dragDirection.current.y > 0
            let targetNeighborId: string | null = null
            let relativePos: 'before' | 'after' = 'before'

            const draggedMidY = e.clientY - dragOffset.y + draggedHeight / 2

            for (let i = 0; i < rects.length; i++) {
              const r = rects[i]
              const neighborMidY = r.top + r.height / 2

              if (draggedMidY > neighborMidY) {
                targetNeighborId = r.id
                relativePos = 'after'
              } else {
                targetNeighborId = r.id
                relativePos = 'before'
                break
              }
            }

            setLocalCards(prev => {
              const card = prev.find(c => c.id === draggedCardId)
              if (!card) return prev

              const updated = prev.filter(c => c.id !== draggedCardId)
              const updatedCard = { ...card, columnId: targetColId }

              let finalIdx = -1
              if (!targetNeighborId) {
                const cardsInTarget = updated.filter(
                  c => (c as TCard & { columnId: string }).columnId === targetColId
                )
                if (cardsInTarget.length === 0) {
                  const colIdx = displayColumns.findIndex(c => c.id === targetColId)
                  for (let i = colIdx + 1; i < displayColumns.length; i++) {
                    const firstInNext = updated.find(
                      c => (c as TCard & { columnId: string }).columnId === displayColumns[i].id
                    )
                    if (firstInNext) {
                      finalIdx = updated.indexOf(firstInNext)
                      break
                    }
                  }
                  if (finalIdx === -1) finalIdx = updated.length
                } else {
                  if (!isMovingDown) {
                    finalIdx = updated.indexOf(cardsInTarget[0])
                  } else {
                    finalIdx = updated.indexOf(cardsInTarget[cardsInTarget.length - 1]) + 1
                  }
                }
              } else {
                const neighborIdx = updated.findIndex(c => c.id === targetNeighborId)
                finalIdx = relativePos === 'before' ? neighborIdx : neighborIdx + 1
              }

              const currentIdx = prev.findIndex(c => c.id === draggedCardId)
              if (
                currentIdx === finalIdx &&
                (prev[currentIdx] as TCard & { columnId: string }).columnId === targetColId
              ) {
                return prev
              }

              const result = [...updated]
              result.splice(finalIdx, 0, updatedCard)
              return result
            })
          }
        }
        return
      }

      // Handle scroll
      if (!isScrolling || !scrollContainerRef.current) return
      e.preventDefault()
      const x = e.pageX - scrollContainerRef.current.offsetLeft
      const walk = (x - startX) * 1.5
      scrollContainerRef.current.scrollLeft = scrollLeft - walk
    },
    [
      draggedColumnId,
      draggedCardId,
      dragOffset,
      placeholderIndex,
      isScrolling,
      startX,
      scrollLeft,
      allCards,
      displayColumns,
      serverColumns,
      draggedWidth,
      draggedHeight,
      onDragStart,
      scrollContainerRef,
      ghostRef,
      cardGhostRef,
      lastMousePos,
      dragDirection,
      columnRects,
      isDraggingCard,
      pendingCardDrag,
      pendingColumnDrag,
      setLocalCards,
      setDraggedCardId,
      setDraggedCardData,
      setDraggedWidth,
      setDraggedHeight,
      setDragOffset,
      setLocalColumns,
      setDraggedColumnId,
      setPlaceholderIndex,
    ]
  )

  const handleMouseUpOrLeave = useCallback(() => {
    pendingCardDrag.current = null
    pendingColumnDrag.current = null

    if (draggedColumnId && placeholderIndex !== null) {
      const finalColumns = [...localColumns] as TColumn[]
      onColumnDrop?.({
        columnId: draggedColumnId,
        finalColumns,
        placeholderIndex,
      })
      setDraggedColumnId(null)
      setPlaceholderIndex(null)
      onDragEnd?.()
    }

    if (draggedCardId) {
      const finalCards = [...localCards] as TCard[]
      const cardIdx = finalCards.findIndex(c => c.id === draggedCardId)
      if (cardIdx !== -1) {
        const droppedCard = finalCards[cardIdx]
        onCardDrop?.({
          cardId: draggedCardId,
          finalCards,
          droppedCard,
        })
      }
      setDraggedCardId(null)
      setDraggedCardData(null)
      onDragEnd?.()
      isDraggingCard.current = false
    }

    setIsScrolling(false)
  }, [
    draggedColumnId,
    draggedCardId,
    placeholderIndex,
    localColumns,
    localCards,
    onDragEnd,
    onColumnDrop,
    onCardDrop,
    pendingCardDrag,
    pendingColumnDrag,
    isDraggingCard,
    setDraggedColumnId,
    setPlaceholderIndex,
    setDraggedCardId,
    setDraggedCardData,
    setIsScrolling,
  ])

  const handleColumnDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const header = e.currentTarget as HTMLElement
      const columnId = header.closest('[data-role="column"]')?.getAttribute('data-column-id')
      if (!columnId) return

      const rect = header.getBoundingClientRect()

      pendingColumnDrag.current = {
        columnId,
        x: e.clientX,
        y: e.clientY,
        rect,
        width: rect.width,
        height: rect.height,
      }
    },
    [pendingColumnDrag]
  )

  const handleCardDragStart = useCallback(
    (card: DraggableItem, e: React.MouseEvent) => {
      if (e.button !== 0) return

      const target = e.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()

      pendingCardDrag.current = {
        item: card as TCard,
        x: e.clientX,
        y: e.clientY,
        rect,
        width: rect.width,
        height: rect.height,
      }
    },
    [pendingCardDrag]
  )

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleColumnDragStart,
    handleCardDragStart,
  }
}
