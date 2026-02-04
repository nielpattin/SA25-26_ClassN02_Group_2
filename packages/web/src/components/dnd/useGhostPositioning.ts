import { useLayoutEffect } from 'react'
import { useDragRefs } from './dragTypes'
import { useDragStore } from '../../store/dragStore'

export function useGhostPositioning() {
  const { ghostRef, cardGhostRef, lastMousePosRef } = useDragRefs()
  const draggedColumnId = useDragStore((s) => s.draggedColumnId)
  const draggedCardId = useDragStore((s) => s.draggedCardId)

  useLayoutEffect(() => {
    const offset = useDragStore.getState().dragOffset
    if (draggedColumnId && ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${lastMousePosRef.current.x - offset.x}px, ${lastMousePosRef.current.y - offset.y}px, 0) rotate(2deg)`
    }
    if (draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${lastMousePosRef.current.x - offset.x}px, ${lastMousePosRef.current.y - offset.y}px, 0)`
    }
  }, [draggedColumnId, draggedCardId, ghostRef, cardGhostRef, lastMousePosRef])
}
