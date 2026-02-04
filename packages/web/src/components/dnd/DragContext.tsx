import { useRef, type ReactNode } from 'react'
import {
  DragRefsContext,
  type DragRefs,
  type CardRect,
  type ColumnRect,
  type PendingDrag,
  type PendingColumnDrag,
} from './dragTypes'

export type DragProviderProps = {
  children: ReactNode
}

export function DragProvider({ children }: DragProviderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const cardGhostRef = useRef<HTMLDivElement>(null)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const dragDirectionRef = useRef({ x: 0, y: 0 })
  const cardRectsRef = useRef<CardRect[]>([])
  const columnRectsRef = useRef<ColumnRect[]>([])
  const isDraggingCardRef = useRef(false)
  const pendingCardDragRef = useRef<PendingDrag<{ id: string; [key: string]: unknown }>>(null)
  const pendingColumnDragRef = useRef<PendingColumnDrag>(null)
  const lastDropTargetRef = useRef<{ columnId: string; insertBeforeId: string | null } | null>(null)

  const refs: DragRefs = {
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
    lastDropTargetRef,
  }

  return (
    <DragRefsContext.Provider value={refs}>
      {children}
    </DragRefsContext.Provider>
  )
}

DragProvider.displayName = 'DragProvider'
