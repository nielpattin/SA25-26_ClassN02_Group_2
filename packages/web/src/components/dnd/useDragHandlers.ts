import { useCallback } from 'react'
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
  const { scrollContainerRef, lastMousePosRef, dragDirectionRef, pendingCardDragRef, pendingColumnDragRef, lastDropTargetRef, isDraggingCardRef } = useDragRefs()

  const setIsScrolling = useDragStore((s) => s.setIsScrolling)
  const setStartX = useDragStore((s) => s.setStartX)
  const setScrollLeft = useDragStore((s) => s.setScrollLeft)
  const clearCardDrag = useDragStore((s) => s.clearCardDrag)
  const clearColumnDrag = useDragStore((s) => s.clearColumnDrag)

  const { activateCardDrag, activateColumnDrag } = usePendingDrag(onDragStart)
  const { updateColumnPosition } = useColumnDrag()
  const { updateCardPosition } = useCardDrag()
  useGhostPositioning()

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
        activateCardDrag(e, allCards)
      }

      if (pendingColumnDragRef.current) {
        activateColumnDrag(e, serverColumns)
      }

      if (state.draggedColumnId) {
        updateColumnPosition(e)
        return
      }

      if (state.draggedCardId) {
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
      allCards,
      serverColumns,
      scrollContainerRef,
      lastMousePosRef,
      dragDirectionRef,
      pendingCardDragRef,
      pendingColumnDragRef,
      activateCardDrag,
      activateColumnDrag,
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
      clearColumnDrag()
      onDragEnd?.()
    }

    if (state.draggedCardId && state.dropTarget) {
      const cardsInColumn = allCards.filter(
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
        cardId: state.draggedCardId,
        columnId: state.dropTarget.columnId,
        beforeCardId,
        afterCardId,
      })

      lastDropTargetRef.current = null
      isDraggingCardRef.current = false
      clearCardDrag()
      onDragEnd?.()
    }

    if (state.draggedCardId && !state.dropTarget) {
      lastDropTargetRef.current = null
      isDraggingCardRef.current = false
      clearCardDrag()
    }

    setIsScrolling(false)
  }, [
    allCards,
    onDragEnd,
    onColumnDrop,
    onCardDrop,
    pendingCardDragRef,
    pendingColumnDragRef,
    lastDropTargetRef,
    isDraggingCardRef,
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
