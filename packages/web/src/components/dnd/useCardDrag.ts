import { useCallback } from 'react'
import { useDragRefs } from './dragTypes'
import { useDragStore, type DropTarget } from '../../store/dragStore'

export function useCardDrag() {
  const { scrollContainerRef, columnRectsRef, cardGhostRef, lastDropTargetRef } = useDragRefs()
  const setDropTarget = useDragStore((s) => s.setDropTarget)

  const updateCardPosition = useCallback((e: React.MouseEvent) => {
    const state = useDragStore.getState()
    if (!state.draggedCardId) return

    if (cardGhostRef.current) {
      const offset = state.dragOffset
      cardGhostRef.current.style.transform = `translate3d(${e.clientX - offset.x}px, ${e.clientY - offset.y}px, 0)`
    }

    if (!scrollContainerRef.current) return

    const colRects = columnRectsRef.current
    const hoveredCol = colRects.find(r => e.clientX >= r.left && e.clientX <= r.right)

    if (hoveredCol) {
      const targetColId = hoveredCol.id

      const cardElements = Array.from(
        scrollContainerRef.current.querySelectorAll(
          `[data-role="card-wrapper"][data-column-id="${targetColId}"]:not([data-card-id="${state.draggedCardId}"])`
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

      const offset = state.dragOffset
      const draggedMidY = e.clientY - offset.y + state.draggedHeight / 2

      let insertBeforeId: string | null = null
      for (const r of rects) {
        if (draggedMidY < r.midY) {
          insertBeforeId = r.id
          break
        }
      }

      const newTarget: DropTarget = { columnId: targetColId, insertBeforeId }
      if (
        lastDropTargetRef.current?.columnId !== newTarget.columnId ||
        lastDropTargetRef.current?.insertBeforeId !== newTarget.insertBeforeId
      ) {
        lastDropTargetRef.current = newTarget
        setDropTarget(newTarget)
      }
    }
  }, [scrollContainerRef, columnRectsRef, cardGhostRef, lastDropTargetRef, setDropTarget])

  return { updateCardPosition }
}
