import { createContext, useContext, type RefObject } from 'react'

// Generic item types for DnD operations
export type DraggableItem = {
  id: string
  [key: string]: unknown
}

export type DragOffset = {
  x: number
  y: number
}

export type DropTarget = {
  columnId: string
  insertBeforeId: string | null // null means insert at end
}

export type PendingDrag<T extends DraggableItem> =
  | {
      item: T
      x: number
      y: number
      rect: DOMRect
      width: number
      height: number
    }
  | null

export type ColumnRect = {
  id: string
  left: number
  right: number
  top: number
  bottom: number
}

export type CardRect = {
  id: string
  columnId: string
  top: number
  height: number
}

export type DragState<TColumn extends DraggableItem, TCard extends DraggableItem> = {
  // Column drag state
  draggedColumnId: string | null
  setDraggedColumnId: (id: string | null) => void
  localColumns: TColumn[]
  setLocalColumns: React.Dispatch<React.SetStateAction<TColumn[]>>
  placeholderIndex: number | null
  setPlaceholderIndex: (index: number | null) => void

  // Card drag state
  draggedCardId: string | null
  setDraggedCardId: (id: string | null) => void
  draggedCardData: TCard | null
  setDraggedCardData: (card: TCard | null) => void
  dropTarget: DropTarget | null
  setDropTarget: (target: DropTarget | null) => void
  droppedCardId: string | null
  setDroppedCardId: (id: string | null) => void
  dragSourceColumnId: string | null
  setDragSourceColumnId: (id: string | null) => void

  // Shared drag state
  dragOffset: DragOffset
  setDragOffset: (offset: DragOffset) => void
  draggedWidth: number
  setDraggedWidth: (width: number) => void
  draggedHeight: number
  setDraggedHeight: (height: number) => void

  // Scroll state
  isScrolling: boolean
  setIsScrolling: (scrolling: boolean) => void
  startX: number
  setStartX: (x: number) => void
  scrollLeft: number
  setScrollLeft: (left: number) => void

  // Refs
  scrollContainerRef: RefObject<HTMLDivElement | null>
  ghostRef: RefObject<HTMLDivElement | null>
  cardGhostRef: RefObject<HTMLDivElement | null>
  lastMousePosRef: RefObject<{ x: number; y: number }>
  dragDirectionRef: RefObject<{ x: number; y: number }>
  cardRectsRef: RefObject<CardRect[]>
  columnRectsRef: RefObject<ColumnRect[]>
  isDraggingCardRef: RefObject<boolean>
  pendingCardDragRef: RefObject<PendingDrag<TCard>>
  pendingColumnDragRef: RefObject<{
    columnId: string
    x: number
    y: number
    rect: DOMRect
    width: number
    height: number
  } | null>

  // Computed
  isAnyDragging: boolean
}

// Create context with undefined default (must be used within provider)
export const DragContext = createContext<DragState<DraggableItem, DraggableItem> | undefined>(
  undefined
)

export function useDragContext<
  TColumn extends DraggableItem = DraggableItem,
  TCard extends DraggableItem = DraggableItem,
>(): DragState<TColumn, TCard> {
  const context = useContext(DragContext)
  if (!context) {
    throw new Error('useDragContext must be used within a DragProvider')
  }
  // Type assertion is safe here as we know the shape matches
  return context as unknown as DragState<TColumn, TCard>
}
