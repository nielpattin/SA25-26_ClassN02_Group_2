import { useState, useRef, type ReactNode } from 'react'
import {
  DragContext,
  type DraggableItem,
  type DragOffset,
  type DragState,
  type CardRect,
  type ColumnRect,
  type PendingDrag,
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
  const [localCards, setLocalCards] = useState<DraggableItem[]>([])

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
  const lastMousePos = useRef({ x: 0, y: 0 })
  const dragDirection = useRef({ x: 0, y: 0 })
  const cardRects = useRef<CardRect[]>([])
  const columnRects = useRef<ColumnRect[]>([])
  const isDraggingCard = useRef(false)
  const pendingCardDrag = useRef<PendingDrag<DraggableItem>>(null)
  const pendingColumnDrag = useRef<{
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
    cardRects,
    columnRects,
    isDraggingCard,
    pendingCardDrag,
    pendingColumnDrag,
    isAnyDragging,
  }

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>
}

DragProvider.displayName = 'DragProvider'
