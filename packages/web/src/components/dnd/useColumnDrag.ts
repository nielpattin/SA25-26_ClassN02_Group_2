import { useCallback } from 'react'
import { useDragRefs } from './dragTypes'
import { useDragStore } from '../../store/dragStore'

export function useColumnDrag() {
  const { scrollContainerRef, columnRectsRef, ghostRef } = useDragRefs()
  const setPlaceholderIndex = useDragStore((s) => s.setPlaceholderIndex)
  const setLocalColumns = useDragStore((s) => s.setLocalColumns)

  const updateColumnPosition = useCallback((e: React.MouseEvent) => {
    const state = useDragStore.getState()
    if (!state.draggedColumnId || !scrollContainerRef.current) return

    if (ghostRef.current) {
      const offset = state.dragOffset
      ghostRef.current.style.transform = `translate3d(${e.clientX - offset.x}px, ${e.clientY - offset.y}px, 0) rotate(2deg)`
    }

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
      .filter(c => c.id !== state.draggedColumnId)

    let newIndex = state.placeholderIndex ?? 0
    const draggedMidX = e.clientX - state.dragOffset.x + state.draggedWidth / 2

    for (let i = 0; i < otherCols.length; i++) {
      const { left, width } = otherCols[i]
      const neighborMidX = left + width / 2

      if (draggedMidX > neighborMidX && i >= (state.placeholderIndex ?? 0)) {
        newIndex = i + 1
      } else if (draggedMidX < neighborMidX && i < (state.placeholderIndex ?? 0)) {
        newIndex = i
        break
      }
    }

    if (newIndex !== state.placeholderIndex) {
      setPlaceholderIndex(newIndex)

      setLocalColumns(prev => {
        const filtered = prev.filter(c => c.id !== state.draggedColumnId)
        const draggedCol = prev.find(c => c.id === state.draggedColumnId)
        if (!draggedCol) return prev
        const updated = [...filtered]
        updated.splice(newIndex, 0, draggedCol)
        return updated
      })
    }
  }, [scrollContainerRef, columnRectsRef, ghostRef, setPlaceholderIndex, setLocalColumns])

  return { updateColumnPosition }
}
