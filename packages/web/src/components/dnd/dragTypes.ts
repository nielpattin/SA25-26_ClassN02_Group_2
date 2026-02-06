import { createContext, useContext, type RefObject } from 'react'

export type { DraggableItem, DragOffset, DropTarget } from '../../store/dragStore'

export type PendingDrag<T> =
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

export type CardRectsMeta = {
  columnId: string | null
  scrollTop: number
  needsRefresh: boolean
}

export type PendingColumnDrag = {
  columnId: string
  x: number
  y: number
  rect: DOMRect
  width: number
  height: number
} | null

export type DragRefs = {
  scrollContainerRef: RefObject<HTMLDivElement | null>
  ghostRef: RefObject<HTMLDivElement | null>
  cardGhostRef: RefObject<HTMLDivElement | null>
  lastMousePosRef: RefObject<{ x: number, y: number }>
  dragDirectionRef: RefObject<{ x: number, y: number }>
  cardRectsRef: RefObject<CardRect[]>
  cardRectsMetaRef: RefObject<CardRectsMeta>
  columnRectsRef: RefObject<ColumnRect[]>
  isDraggingCardRef: RefObject<boolean>
  pendingCardDragRef: RefObject<PendingDrag<{ id: string, [key: string]: unknown }>>
  pendingColumnDragRef: RefObject<PendingColumnDrag>
  lastDropTargetRef: RefObject<{ columnId: string, insertBeforeId: string | null } | null>
}

export const DragRefsContext = createContext<DragRefs | undefined>(undefined)

export function useDragRefs(): DragRefs {
  const context = useContext(DragRefsContext)
  if (!context) {
    throw new Error('useDragRefs must be used within a DragProvider')
  }
  return context
}
