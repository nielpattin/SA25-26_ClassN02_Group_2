import { useState, useRef, type ReactNode } from 'react'
import {
  DragContext,
  type DraggableItem,
  type DragOffset,
  type DragState,
  type CardRect,
  type ColumnRect,
  type PendingDrag,
  type DropTarget,
} from './dragTypes'

export type DragProviderProps = {
  children: ReactNode
}

export function DragProvider({ children }: DragProviderProps) {
  // Column drag state
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [localColumns, setLocalColumns] = useState<DraggableItem[]>([])
  const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null)

  // Card drag state
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [draggedCardData, setDraggedCardData] = useState<DraggableItem | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [droppedCardId, setDroppedCardId] = useState<string | null>(null)
  const [dragSourceColumnId, setDragSourceColumnId] = useState<string | null>(null)

  // Shared drag state
  const [dragOffset, setDragOffset] = useState<DragOffset>({ x: 0, y: 0 })
  const [draggedWidth, setDraggedWidth] = useState(0)
  const [draggedHeight, setDraggedHeight] = useState(0)

  // Scroll state
  const [isScrolling, setIsScrolling] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const cardGhostRef = useRef<HTMLDivElement>(null)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const dragDirectionRef = useRef({ x: 0, y: 0 })
  const cardRectsRef = useRef<CardRect[]>([])
  const columnRectsRef = useRef<ColumnRect[]>([])
  const isDraggingCardRef = useRef(false)
  const pendingCardDragRef = useRef<PendingDrag<DraggableItem>>(null)
  const pendingColumnDragRef = useRef<{
    columnId: string
    x: number
    y: number
    rect: DOMRect
    width: number
    height: number
  } | null>(null)

  const isAnyDragging = Boolean(draggedCardId) || Boolean(draggedColumnId)

  const value: DragState<DraggableItem, DraggableItem> = {
    draggedColumnId,
    setDraggedColumnId,
    localColumns,
    setLocalColumns,
    placeholderIndex,
    setPlaceholderIndex,
    draggedCardId,
    setDraggedCardId,
    draggedCardData,
    setDraggedCardData,
    dropTarget,
    setDropTarget,
    droppedCardId,
    setDroppedCardId,
    dragSourceColumnId,
    setDragSourceColumnId,
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
    lastMousePosRef,
    dragDirectionRef,
    cardRectsRef,
    columnRectsRef,
    isDraggingCardRef,
    pendingCardDragRef,
    pendingColumnDragRef,
    isAnyDragging,
  }

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>
}

DragProvider.displayName = 'DragProvider'
