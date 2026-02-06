import { useCallback } from 'react'
import { useDragRefs } from './dragTypes'
import { useDragStore, type DropTarget } from '../../store/dragStore'

export function useCardDrag() {
  const {
    scrollContainerRef,
    columnRectsRef,
    cardGhostRef,
    lastDropTargetRef,
    cardRectsRef,
    cardRectsMetaRef,
  } = useDragRefs()
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
      const stateChanged = cardRectsMetaRef.current.columnId !== targetColId
      const listEl = scrollContainerRef.current.querySelector(
        `[data-role="column"][data-column-id="${targetColId}"] [data-role="card-list"]`
      ) as HTMLElement | null
      const listRect = listEl?.getBoundingClientRect()
      const listTop = listRect?.top ?? 0
      const listScrollTop = listEl?.scrollTop ?? 0
      const relativeMouseY = e.clientY - listTop + listScrollTop

      const needsRefresh = cardRectsMetaRef.current.needsRefresh
      const scrollChanged = cardRectsMetaRef.current.scrollTop !== listScrollTop

      if (stateChanged || needsRefresh || scrollChanged) {
        const columnEl = scrollContainerRef.current.querySelector(
          `[data-role="column"][data-column-id="${targetColId}"]`
        ) as HTMLElement | null

        if (columnEl) {
          const cardElements = Array.from(
            columnEl.querySelectorAll('[data-role="card-wrapper"][data-card-id]')
          ) as HTMLElement[]

          cardRectsRef.current = cardElements.map(el => {
            return {
              id: el.dataset.cardId ?? '',
              columnId: targetColId,
              top: el.offsetTop,
              height: el.offsetHeight,
            }
          })
        }

        cardRectsMetaRef.current = {
          columnId: targetColId,
          scrollTop: listScrollTop,
          needsRefresh: false,
        }
      }

      const rects = cardRectsRef.current
        .filter(r => r.columnId === targetColId && r.id !== state.draggedCardId)
        .map(r => ({
          id: r.id,
          midY: r.top + r.height / 2,
        }))

      const offset = state.dragOffset
      const draggedMidY = relativeMouseY - offset.y + state.draggedHeight / 2

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
  }, [
    scrollContainerRef,
    columnRectsRef,
    cardGhostRef,
    lastDropTargetRef,
    cardRectsRef,
    cardRectsMetaRef,
    setDropTarget,
  ])

  return { updateCardPosition }
}
