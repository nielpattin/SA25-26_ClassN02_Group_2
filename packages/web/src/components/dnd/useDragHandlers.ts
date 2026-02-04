import { useCallback, useLayoutEffect, useRef } from 'react'
import { useDragContext, type DraggableItem, type DropTarget } from './dragTypes'

export type ColumnDropResult<TColumn extends DraggableItem> = {
  columnId: string
  finalColumns: TColumn[]
  placeholderIndex: number
}

export type CardDropResult = {
  cardId: string
  columnId: string
  beforeCardId: string | undefined
  afterCardId: string | undefined
}

export type UseDragHandlersOptions<TColumn extends DraggableItem, TCard extends DraggableItem> = {
  serverColumns: TColumn[]
  allCards: TCard[]
  onDragStart?: () => void
  onDragEnd?: () => void
  onColumnDrop?: (result: ColumnDropResult<TColumn>) => void
  onCardDrop?: (result: CardDropResult) => void
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
    dropTarget,
    setDropTarget,
    setDroppedCardId,
    setDragSourceColumnId,
    dragOffset,
    setDragOffset,
    setDraggedWidth,
    setDraggedHeight,
    draggedWidth,
    draggedHeight,
    isScrolling,
    setIsScrolling,
    startX,
    setStartX,
    scrollLeft,
    setScrollLeft,
    scrollContainerRef,
    ghostRef,
    cardGhostRef,
    lastMousePosRef,
    dragDirectionRef,
    columnRectsRef,
    isDraggingCardRef,
    pendingCardDragRef,
    pendingColumnDragRef,
  } = useDragContext<TColumn, TCard>()

  // Track last drop target to avoid unnecessary state updates
  const lastDropTarget = useRef<DropTarget | null>(null)

  // Update ghost position on drag state change
  useLayoutEffect(() => {
    if (draggedColumnId && ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${lastMousePosRef.current.x - dragOffset.x}px, ${lastMousePosRef.current.y - dragOffset.y}px, 0) rotate(2deg)`
    }
    if (draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${lastMousePosRef.current.x - dragOffset.x}px, ${lastMousePosRef.current.y - dragOffset.y}px, 0)`
    }
  }, [draggedColumnId, draggedCardId, dragOffset, ghostRef, cardGhostRef, lastMousePosRef])

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
      const dx = e.clientX - lastMousePosRef.current.x
      const dy = e.clientY - lastMousePosRef.current.y
      if (dx !== 0) dragDirectionRef.current.x = dx > 0 ? 1 : -1
      if (dy !== 0) dragDirectionRef.current.y = dy > 0 ? 1 : -1

      lastMousePosRef.current = { x: e.clientX, y: e.clientY }

      // Handle pending card drag - start drag after threshold
      if (pendingCardDragRef.current) {
        const { x, y, item: card, rect, width, height } = pendingCardDragRef.current
        const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))

        if (dist > 5) {
          if (scrollContainerRef.current) {
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
          }

          setDraggedCardId(card.id)
          setDraggedCardData(card)
          setDraggedWidth(width)
          setDraggedHeight(height)
          setDragOffset({ x: x - rect.left, y: y - rect.top })
          
          // Initialize drop target to current position and track source column
          const cardWithCol = card as TCard & { columnId: string }
          
          // Better initialization: find the card after us to stay in place
          const colCards = allCards.filter(c => (c as TCard & { columnId: string }).columnId === cardWithCol.columnId)
          const myIdx = colCards.findIndex(c => c.id === card.id)
          const initialInsertBeforeId = myIdx !== -1 && myIdx < colCards.length - 1 
            ? colCards[myIdx + 1].id 
            : null

          setDropTarget({ columnId: cardWithCol.columnId, insertBeforeId: initialInsertBeforeId })
          setDragSourceColumnId(cardWithCol.columnId)
          lastDropTarget.current = { columnId: cardWithCol.columnId, insertBeforeId: initialInsertBeforeId }
          
          onDragStart?.()
          isDraggingCardRef.current = true
          pendingCardDragRef.current = null
        }
      }

      // Handle pending column drag
      if (pendingColumnDragRef.current) {
        const { x, y, columnId, rect, width, height } = pendingColumnDragRef.current
        const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))

        if (dist > 5) {
          if (scrollContainerRef.current) {
            const cols = Array.from(
              scrollContainerRef.current.querySelectorAll('[data-role="column"]')
            )
            columnRectsRef.current = cols.map(col => {
              const r = col.getBoundingClientRect()
              const colId = (col as HTMLElement).dataset.columnId ?? ''
              return {
                id: colId,
                left: r.left,
                right: r.right,
                top: r.top,
                bottom: r.bottom,
              }
            })
          }

          setLocalColumns(serverColumns)
          setDraggedColumnId(columnId)
          setDraggedWidth(width)
          setDraggedHeight(height)
          setDragOffset({ x: x - rect.left, y: y - rect.top })
          onDragStart?.()

          const index = serverColumns.findIndex(c => c.id === columnId)
          setPlaceholderIndex(index)
          pendingColumnDragRef.current = null
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
          const cachedRects = columnRectsRef.current
          const otherCols = colElements
            .map(el => {
              const id = (el as HTMLElement).dataset.columnId ?? ''
              const cached = cachedRects.find(c => c.id === id)
              const colWidth = cached ? cached.right - cached.left : 300
              const r = el.getBoundingClientRect()
              return { id, left: r.left, width: colWidth }
            })
            .filter(c => c.id !== draggedColumnId)

          let newIndex = placeholderIndex ?? 0
          const draggedMidX = e.clientX - dragOffset.x + draggedWidth / 2

          for (let i = 0; i < otherCols.length; i++) {
            const { left, width } = otherCols[i]
            const neighborMidX = left + width / 2

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

      // Handle active card drag - just update drop target, don't manipulate arrays
      if (draggedCardId) {
        if (cardGhostRef.current) {
          cardGhostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0)`
        }

        if (scrollContainerRef.current) {
          const colRects = columnRectsRef.current

          const hoveredCol = colRects.find(r => e.clientX >= r.left && e.clientX <= r.right)
          if (hoveredCol) {
            const targetColId = hoveredCol.id
            
            // Find cards in target column (excluding the dragged card)
            const cardElements = Array.from(
              scrollContainerRef.current.querySelectorAll(
                `[data-role="card-wrapper"][data-column-id="${targetColId}"]:not([data-card-id="${draggedCardId}"])`
              )
            )

            const rects = cardElements.map(el => {
              const cardContent = el.querySelector('[data-role="card"]') || el
              const r = cardContent.getBoundingClientRect()
              return {
                id: (el as HTMLElement).dataset.cardId ?? '',
                top: r.top,
                bottom: r.bottom,
                midY: r.top + r.height / 2,
              }
            })

            const draggedMidY = e.clientY - dragOffset.y + draggedHeight / 2

            // Find where to insert
            let insertBeforeId: string | null = null
            for (const r of rects) {
              if (draggedMidY < r.midY) {
                insertBeforeId = r.id
                break
              }
            }

            // Only update if changed
            const newTarget: DropTarget = { columnId: targetColId, insertBeforeId }
            if (
              lastDropTarget.current?.columnId !== newTarget.columnId ||
              lastDropTarget.current?.insertBeforeId !== newTarget.insertBeforeId
            ) {
              lastDropTarget.current = newTarget
              setDropTarget(newTarget)
            }
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
      serverColumns,
      draggedWidth,
      draggedHeight,
      onDragStart,
      scrollContainerRef,
      ghostRef,
      cardGhostRef,
      lastMousePosRef,
      dragDirectionRef,
      columnRectsRef,
      isDraggingCardRef,
      pendingCardDragRef,
      pendingColumnDragRef,
      setDraggedCardId,
      setDraggedCardData,
      setDraggedWidth,
      setDraggedHeight,
      setDragOffset,
      setDropTarget,
      setLocalColumns,
      setDraggedColumnId,
      setPlaceholderIndex,
      setDragSourceColumnId,
    ]
  )

  const handleMouseUpOrLeave = useCallback(() => {
    pendingCardDragRef.current = null
    pendingColumnDragRef.current = null

    if (draggedColumnId && placeholderIndex !== null) {
      const finalColumns = [...localColumns]
      onColumnDrop?.({
        columnId: draggedColumnId,
        finalColumns,
        placeholderIndex,
      })
      setDraggedColumnId(null)
      setPlaceholderIndex(null)
      onDragEnd?.()
    }

    if (draggedCardId && dropTarget) {
      // Find before/after card IDs for the API call
      const cardsInColumn = allCards.filter(
        c => (c as TCard & { columnId: string }).columnId === dropTarget.columnId &&
             c.id !== draggedCardId
      )
      
      let beforeCardId: string | undefined
      let afterCardId: string | undefined
      
      if (dropTarget.insertBeforeId) {
        // Inserting before a specific card
        const insertIdx = cardsInColumn.findIndex(c => c.id === dropTarget.insertBeforeId)
        afterCardId = dropTarget.insertBeforeId
        beforeCardId = insertIdx > 0 ? cardsInColumn[insertIdx - 1].id : undefined
      } else {
        // Inserting at end
        beforeCardId = cardsInColumn.length > 0 ? cardsInColumn[cardsInColumn.length - 1].id : undefined
        afterCardId = undefined
      }

      onCardDrop?.({
        cardId: draggedCardId,
        columnId: dropTarget.columnId,
        beforeCardId,
        afterCardId,
      })

      // Clear ghost and drop target immediately so they disappear
      setDraggedCardData(null)
      setDropTarget(null)
      lastDropTarget.current = null
      onDragEnd?.()
      isDraggingCardRef.current = false

      // Clear all card drag state after delay to let React update DOM
      setTimeout(() => {
        setDraggedCardId(null)
        setDroppedCardId(null)
        setDragSourceColumnId(null)
      }, 0)
    }

    // Clear card drag state even if no drop target
    if (draggedCardId && !dropTarget) {
      setDraggedCardData(null)
      setTimeout(() => {
        setDraggedCardId(null)
        setDropTarget(null)
        setDragSourceColumnId(null)
        lastDropTarget.current = null
        isDraggingCardRef.current = false
      }, 0)
    }

    setIsScrolling(false)
  }, [
    draggedColumnId,
    draggedCardId,
    dropTarget,
    placeholderIndex,
    localColumns,
    allCards,
    onDragEnd,
    onColumnDrop,
    onCardDrop,
    pendingCardDragRef,
    pendingColumnDragRef,
    isDraggingCardRef,
    setDraggedColumnId,
    setPlaceholderIndex,
    setDraggedCardId,
    setDraggedCardData,
    setDropTarget,
    setDroppedCardId,
    setDragSourceColumnId,
    setIsScrolling,
  ])

  const handleColumnDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return
      const header = e.currentTarget as HTMLElement
      const columnId = header.closest('[data-role="column"]')?.getAttribute('data-column-id')
      if (!columnId) return

      const rect = header.getBoundingClientRect()

      pendingColumnDragRef.current = {
        columnId,
        x: e.clientX,
        y: e.clientY,
        rect,
        width: rect.width,
        height: rect.height,
      }
    },
    [pendingColumnDragRef]
  )

  const handleCardDragStart = useCallback(
    (card: DraggableItem, e: React.MouseEvent) => {
      if (e.button !== 0) return

      const target = e.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()

      pendingCardDragRef.current = {
        item: card as TCard,
        x: e.clientX,
        y: e.clientY,
        rect,
        width: rect.width,
        height: rect.height,
      }
    },
    [pendingCardDragRef]
  )

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleColumnDragStart,
    handleCardDragStart,
  }
}
