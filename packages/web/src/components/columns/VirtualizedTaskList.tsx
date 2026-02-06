import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TaskCard } from '../tasks'
import { useDragStore } from '../../store/dragStore'
import type { TaskWithLabels } from '../../hooks/useTasks'
import type { DropTarget } from '../dnd/dragTypes'

const CARD_GAP = 16
const ESTIMATED_CARD_HEIGHT = 80

interface VirtualizedTaskListProps {
  cards: TaskWithLabels[]
  columnId: string
  onCardClick: (id: string) => void
  onCardDragStart: (card: TaskWithLabels, e: React.MouseEvent) => void
  draggedCardId: string | null
  dragSourceColumnId: string | null
  draggedHeight: number
  isAnyDragging: boolean
  isFiltering: boolean
  dropTarget: DropTarget | null
}

function getVirtualShift(
  index: number,
  cardId: string,
  cards: TaskWithLabels[],
  draggedCardId: string | null,
  dragSourceColumnId: string | null,
  draggedHeight: number,
  dropTarget: DropTarget | null,
  columnId: string,
): number {
  if (!draggedCardId || cardId === draggedCardId || !dropTarget) return 0

  const amount = draggedHeight + CARD_GAP
  const isSource = dragSourceColumnId === columnId
  const isTarget = dropTarget.columnId === columnId
  const draggedIndex = cards.findIndex(c => c.id === draggedCardId)
  const insertIndex = isTarget
    ? (dropTarget.insertBeforeId
      ? cards.findIndex(c => c.id === dropTarget.insertBeforeId)
      : cards.length)
    : -1

  if (isSource && isTarget) {
    if (draggedIndex < 0 || insertIndex < 0) return 0
    if (draggedIndex < insertIndex) {
      if (index > draggedIndex && index < insertIndex) return -amount
    } else if (draggedIndex > insertIndex) {
      if (index >= insertIndex && index < draggedIndex) return amount
    }
  } else if (isSource && !isTarget) {
    if (draggedIndex >= 0 && index > draggedIndex) return -amount
  } else if (!isSource && isTarget) {
    if (insertIndex >= 0 && index >= insertIndex) return amount
  }

  return 0
}

export function VirtualizedTaskList({
  cards,
  columnId,
  onCardClick,
  onCardDragStart,
  draggedCardId,
  dragSourceColumnId,
  draggedHeight,
  isAnyDragging,
  isFiltering,
  dropTarget,
}: VirtualizedTaskListProps) {
  const isActivelyDragging = useDragStore((s) => s.isDragging)
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    gap: CARD_GAP,
    overscan: 5,
  })

  const showDropIndicatorEmpty =
    dropTarget?.columnId === columnId && dropTarget.insertBeforeId === null && cards.length === 0

  if (cards.length === 0) {
    return (
      <div className="flex min-h-5 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-1 pb-3">
        {showDropIndicatorEmpty && (
          <div className="h-24 shrink-0 rounded-none border-2 border-dashed border-black/40 bg-black/5" />
        )}
        {!showDropIndicatorEmpty && (
          <div className="border border-dashed border-black bg-black/5 p-4 text-center text-[12px] font-bold text-text-subtle uppercase">
            {isFiltering ? 'No tasks match filters' : 'No items'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      ref={parentRef}
      className="flex min-h-5 flex-1 flex-col overflow-y-auto px-1 pt-1 pb-3"
      data-role="card-list"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const card = cards[virtualRow.index]
          const isDragged = card.id === draggedCardId
          const shift = getVirtualShift(
            virtualRow.index, card.id, cards,
            draggedCardId, dragSourceColumnId, draggedHeight,
            dropTarget, columnId,
          )

          return (
            <div
              key={card.id}
              data-index={virtualRow.index}
              data-role="card-wrapper"
              data-card-id={card.id}
              data-shift={shift || undefined}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: `${virtualRow.start}px`,
                left: 0,
                width: '100%',
                transform: shift ? `translateY(${shift}px)` : undefined,
                transition: isActivelyDragging ? 'transform 150ms ease' : 'none',
                opacity: isDragged ? 0.15 : 1,
                pointerEvents: isDragged ? 'none' : undefined,
              }}
            >
              <TaskCard
                task={card}
                onTaskClick={onCardClick}
                onTaskDragStart={onCardDragStart}
                isAnyDragging={isAnyDragging}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
