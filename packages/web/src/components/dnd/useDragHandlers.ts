import { useCallback, useEffect, useRef } from 'react'
import { useDragStore, type DraggableItem } from '../../store/dragStore'
import { useDragRefs } from './dragTypes'
import { usePendingDrag } from './usePendingDrag'
import { useColumnDrag } from './useColumnDrag'
import { useCardDrag } from './useCardDrag'
import { useGhostPositioning } from './useGhostPositioning'

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
    scrollContainerRef,
    columnRectsRef,
    lastMousePosRef,
    dragDirectionRef,
    pendingCardDragRef,
    pendingColumnDragRef,
    lastDropTargetRef,
    isDraggingCardRef,
  } = useDragRefs()

  const latestCardsRef = useRef(allCards)
  const latestColumnsRef = useRef(serverColumns)

  useEffect(() => {
    latestCardsRef.current = allCards
  }, [allCards])

  useEffect(() => {
    latestColumnsRef.current = serverColumns
  }, [serverColumns])

  const setIsScrolling = useDragStore((s) => s.setIsScrolling)
  const setStartX = useDragStore((s) => s.setStartX)
  const setScrollLeft = useDragStore((s) => s.setScrollLeft)
  const clearCardDrag = useDragStore((s) => s.clearCardDrag)
  const clearColumnDrag = useDragStore((s) => s.clearColumnDrag)

  const { activateCardDrag, activateColumnDrag } = usePendingDrag(onDragStart)
  const { updateColumnPosition } = useColumnDrag()
  const { updateCardPosition } = useCardDrag()
  useGhostPositioning()

  const autoScrollColumn = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    const hoveredCol = columnRectsRef.current.find(
      r => e.clientX >= r.left && e.clientX <= r.right
    )
    if (!hoveredCol) return

    const columnEl = scrollContainerRef.current.querySelector(
      `[data-role="column"][data-column-id="${hoveredCol.id}"]`
    ) as HTMLElement | null
    if (!columnEl) return

    const listEl = columnEl.querySelector('[data-role="card-list"]') as HTMLElement | null
    if (!listEl) return

    const rect = listEl.getBoundingClientRect()
    const threshold = 80
    const speed = 18
    const maxScrollTop = listEl.scrollHeight - listEl.clientHeight

    if (maxScrollTop <= 0) return

    if (e.clientY < rect.top + threshold) {
      listEl.scrollTop = Math.max(0, listEl.scrollTop - speed)
    } else if (e.clientY > rect.bottom - threshold) {
      listEl.scrollTop = Math.min(maxScrollTop, listEl.scrollTop + speed)
    }
  }, [scrollContainerRef, columnRectsRef])

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

      const state = useDragStore.getState()

      if (pendingCardDragRef.current) {
        activateCardDrag(e, latestCardsRef.current)
      }

      if (pendingColumnDragRef.current) {
        activateColumnDrag(e, latestColumnsRef.current)
      }

      if (state.draggedColumnId && state.isDragging) {
        updateColumnPosition(e)
        return
      }

      if (state.draggedCardId && state.isDragging) {
        autoScrollColumn(e)
        updateCardPosition(e)
        return
      }

      if (!state.isScrolling || !scrollContainerRef.current) return
      e.preventDefault()
      const x = e.pageX - scrollContainerRef.current.offsetLeft
      const walk = (x - state.startX) * 1.5
      scrollContainerRef.current.scrollLeft = state.scrollLeft - walk
    },
    [
      scrollContainerRef,
      columnRectsRef,
      lastMousePosRef,
      dragDirectionRef,
      pendingCardDragRef,
      pendingColumnDragRef,
      latestCardsRef,
      latestColumnsRef,
      activateCardDrag,
      activateColumnDrag,
      autoScrollColumn,
      updateColumnPosition,
      updateCardPosition,
    ]
  )

  const handleMouseUpOrLeave = useCallback(() => {
    pendingCardDragRef.current = null
    pendingColumnDragRef.current = null

    const state = useDragStore.getState()

    if (state.draggedColumnId && state.placeholderIndex !== null) {
      const finalColumns = [...state.localColumns] as TColumn[]
      
      onColumnDrop?.({
        columnId: state.draggedColumnId,
        finalColumns,
        placeholderIndex: state.placeholderIndex,
      })
      onDragEnd?.()
    }

    if (state.draggedCardId && state.dropTarget) {
      const { draggedCardId, dropTarget } = state
      const cardsInColumn = latestCardsRef.current.filter(
        c => (c as TCard & { columnId: string }).columnId === dropTarget.columnId &&
             c.id !== draggedCardId
      )

      let beforeCardId: string | undefined
      let afterCardId: string | undefined

      if (dropTarget.insertBeforeId) {
        const insertIdx = cardsInColumn.findIndex(c => c.id === dropTarget.insertBeforeId)
        afterCardId = dropTarget.insertBeforeId
        beforeCardId = insertIdx > 0 ? cardsInColumn[insertIdx - 1].id : undefined
      } else {
        beforeCardId = cardsInColumn.length > 0 ? cardsInColumn[cardsInColumn.length - 1].id : undefined
        afterCardId = undefined
      }

      onCardDrop?.({
        cardId: draggedCardId,
        columnId: dropTarget.columnId,
        beforeCardId,
        afterCardId,
      })

      lastDropTargetRef.current = null
      isDraggingCardRef.current = false
      
      clearCardDrag()
      onDragEnd?.()
    }


    if (state.draggedCardId && state.dropTarget) {
      const cardsInColumn = latestCardsRef.current.filter(
        c => (c as TCard & { columnId: string }).columnId === state.dropTarget!.columnId &&
             c.id !== state.draggedCardId
      )

      let beforeCardId: string | undefined
      let afterCardId: string | undefined

      if (state.dropTarget.insertBeforeId) {
        const insertIdx = cardsInColumn.findIndex(c => c.id === state.dropTarget!.insertBeforeId)
        afterCardId = state.dropTarget.insertBeforeId
        beforeCardId = insertIdx > 0 ? cardsInColumn[insertIdx - 1].id : undefined
      } else {
        beforeCardId = cardsInColumn.length > 0 ? cardsInColumn[cardsInColumn.length - 1].id : undefined
        afterCardId = undefined
      }

      onCardDrop?.({
        cardId: state.draggedCardId!,
        columnId: state.dropTarget!.columnId,
        beforeCardId,
        afterCardId,
      })
      onDragEnd?.()
    }

    if (state.draggedCardId && !state.dropTarget) {
      lastDropTargetRef.current = null
      isDraggingCardRef.current = false
      clearCardDrag()
    }

    setIsScrolling(false)
  }, [
    onDragEnd,
    onColumnDrop,
    onCardDrop,
    pendingCardDragRef,
    pendingColumnDragRef,
    lastDropTargetRef,
    isDraggingCardRef,
    latestCardsRef,
    clearCardDrag,
    clearColumnDrag,
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
        item: card,
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
