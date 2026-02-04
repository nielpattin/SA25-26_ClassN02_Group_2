import { useRef, Fragment } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { TaskCard } from '../tasks'
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
  isAnyDragging: boolean
  isFiltering: boolean
  dropTarget: DropTarget | null
}

export function VirtualizedTaskList({
  cards,
  columnId,
  onCardClick,
  onCardDragStart,
  draggedCardId,
  isAnyDragging,
  isFiltering,
  dropTarget,
}: VirtualizedTaskListProps) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    gap: CARD_GAP,
    overscan: 5,
  })

  const showDropIndicatorAtEnd =
    dropTarget?.columnId === columnId && dropTarget.insertBeforeId === null && cards.length > 0

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
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize() + (showDropIndicatorAtEnd ? 96 + CARD_GAP : 0)}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const card = cards[virtualRow.index]
          const showIndicatorBefore =
            dropTarget?.columnId === columnId && dropTarget.insertBeforeId === card.id
          const shouldHide = card.id === draggedCardId

          return (
            <Fragment key={card.id}>
              {showIndicatorBefore && (
                <div
                  style={{
                    position: 'absolute',
                    top: virtualRow.start - CARD_GAP - 96,
                    left: 0,
                    width: '100%',
                    height: 96,
                  }}
                  className="rounded-none border-2 border-dashed border-black/40 bg-black/5"
                />
              )}
              <div
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {!shouldHide && (
                  <TaskCard
                    task={card}
                    onTaskClick={onCardClick}
                    onTaskDragStart={onCardDragStart}
                    isAnyDragging={isAnyDragging}
                  />
                )}
              </div>
            </Fragment>
          )
        })}

        {showDropIndicatorAtEnd && (
          <div
            style={{
              position: 'absolute',
              top: virtualizer.getTotalSize() + CARD_GAP,
              left: 0,
              width: '100%',
              height: 96,
            }}
            className="rounded-none border-2 border-dashed border-black/40 bg-black/5"
          />
        )}
      </div>
    </div>
  )
}
