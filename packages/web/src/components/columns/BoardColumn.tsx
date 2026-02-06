import { memo, useState, useRef, useLayoutEffect } from 'react'
import { Plus, MoreHorizontal, Pencil, Copy, Archive, ExternalLink } from 'lucide-react'
import { TaskCard } from '../tasks'
import { VirtualizedTaskList } from './VirtualizedTaskList'
import { Dropdown } from '../ui/Dropdown'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useDragStore } from '../../store/dragStore'
import type { TaskWithLabels } from '../../hooks/useTasks'
import type { DropTarget } from '../dnd/dragTypes'

const VIRTUALIZATION_THRESHOLD = 20

export type ColumnData = {
  id: string
  name: string
  position: string
  boardId: string
}

export type BoardRef = {
  id: string
  name: string
}

const CARD_GAP = 16

type ShiftParams = {
  index: number
  cardId: string
  cards: TaskWithLabels[]
  draggedCardId: string
  dragSourceColumnId: string | null
  draggedHeight: number
  dropTarget: DropTarget | null
  columnId: string
}

function getCardShift({
  index,
  cardId,
  cards,
  draggedCardId,
  dragSourceColumnId,
  draggedHeight,
  dropTarget,
  columnId,
}: ShiftParams): number {
  if (cardId === draggedCardId) return 0
  if (!dropTarget) return 0

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

export type BoardColumnProps = {
  column: ColumnData
  cards: TaskWithLabels[]
  onCardClick: (id: string) => void
  onDragStart: (e: React.MouseEvent) => void
  onCardDragStart: (card: TaskWithLabels, e: React.MouseEvent) => void
  onAddTask: (columnId: string, title: string) => void | Promise<void>
  onRenameColumn: (columnId: string, newName: string) => void
  onArchiveColumn: (columnId: string) => void
  onCopyColumn: (columnId: string) => void
  onMoveColumnToBoard: (columnId: string, targetBoardId: string) => void
  boards: BoardRef[]
  isDragging?: boolean
  draggedCardId: string | null
  dragSourceColumnId: string | null
  draggedHeight: number
  isAnyDragging: boolean
  isFiltering?: boolean
  dropTarget: DropTarget | null
}

export const BoardColumn = memo(function BoardColumn({
  column,
  cards,
  onCardClick,
  onDragStart,
  onCardDragStart,
  onAddTask,
  onRenameColumn,
  onArchiveColumn,
  onCopyColumn,
  onMoveColumnToBoard,
  boards,
  isDragging = false,
  draggedCardId,
  dragSourceColumnId,
  draggedHeight,
  isAnyDragging,
  isFiltering = false,
  dropTarget,
}: BoardColumnProps) {
  const isActivelyDragging = useDragStore((s) => s.isDragging)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [nameValue, setNameValue] = useState(column.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (isAddingTask) inputRef.current?.focus()
  }, [isAddingTask])

  useLayoutEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [isEditingName])

  const handleSubmit = async () => {
    if (newTaskTitle.trim()) {
      await onAddTask(column.id, newTaskTitle.trim())
      setNewTaskTitle('')
    }
    setIsAddingTask(false)
  }

  const handleRenameSubmit = async () => {
    if (nameValue.trim() && nameValue.trim() !== column.name) {
      await onRenameColumn(column.id, nameValue.trim())
    } else {
      setNameValue(column.name)
    }
    setIsEditingName(false)
  }

  const menuItems = [
    { label: 'Add Card', icon: <Plus size={14} />, onClick: () => setIsAddingTask(true) },
    { label: 'Rename List', icon: <Pencil size={14} />, onClick: () => setIsEditingName(true) },
    { label: 'Copy List', icon: <Copy size={14} />, onClick: () => onCopyColumn(column.id) },
    {
      label: 'Archive',
      icon: <Archive size={14} />,
      onClick: () => onArchiveColumn(column.id),
      variant: 'danger' as const,
    },
    ...boards
      .filter(b => b.id !== column.boardId)
      .map(b => ({
        label: `Move to ${b.name}`,
        icon: <ExternalLink size={14} />,
        onClick: () => onMoveColumnToBoard(column.id, b.id),
      })),
  ]

  return (
    <div
      className={`relative flex max-h-full w-(--board-column-width,300px) min-w-(--board-column-width,300px) flex-col rounded-none border p-4 ${isDragging ? 'translate-0! border-dashed border-black/20 bg-black/5 opacity-100 shadow-none!' : '-translate-x-px -translate-y-px border-black bg-surface shadow-brutal-lg'} ${isAnyDragging ? 'pointer-events-none' : ''}`}
      data-column-id={column.id}
      data-role="column"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${isDragging ? 'invisible' : ''}`}>
        <h4
          className="relative mb-5 flex shrink-0 cursor-grab items-center gap-2.5 border-b border-black p-2 font-heading text-(length:--column-header-size,14px) font-extrabold tracking-widest text-black uppercase"
          onMouseDown={onDragStart}
          data-role="column-header"
        >
          {isEditingName ? (
            <input
              ref={nameInputRef}
              className="font-inherit tracking-inherit m-0 w-full flex-1 border-none bg-transparent p-0 text-inherit uppercase outline-none"
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRenameSubmit()
                if (e.key === 'Escape') {
                  setNameValue(column.name)
                  setIsEditingName(false)
                }
              }}
              onMouseDown={e => e.stopPropagation()}
            />
          ) : (
            <span
              className="flex-1 cursor-text truncate"
              onClick={e => {
                e.stopPropagation()
                setIsEditingName(true)
              }}
            >
              {column.name}
            </span>
          )}
          <span className="ml-auto border border-black bg-accent px-2 py-0.5 text-[11px] font-extrabold">
            {cards.length}
          </span>
          <div onMouseDown={e => e.stopPropagation()} className="flex items-center">
            <Dropdown
              trigger={
                <MoreHorizontal
                  size={14}
                  className={`cursor-pointer ${isMenuOpen ? 'text-black' : 'text-text-muted'}`}
                />
              }
              items={menuItems}
              onOpenChange={setIsMenuOpen}
            />
          </div>
        </h4>
        {cards.length >= VIRTUALIZATION_THRESHOLD ? (
          <VirtualizedTaskList
            cards={cards}
            columnId={column.id}
            onCardClick={onCardClick}
            onCardDragStart={onCardDragStart}
            draggedCardId={draggedCardId}
            dragSourceColumnId={dragSourceColumnId}
            draggedHeight={draggedHeight}
            isAnyDragging={isAnyDragging}
            isFiltering={isFiltering}
            dropTarget={dropTarget}
          />
        ) : (
          <div
            className="relative flex min-h-5 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-1 pb-3"
            data-role="card-list"
          >
            {dropTarget?.columnId === column.id && dropTarget.insertBeforeId === null && cards.length === 0 && (
              <div className="h-24 shrink-0 rounded-none border-2 border-dashed border-black/40 bg-black/5" />
            )}
            {cards.map((card, index) => {
              const isBeingDragged = card.id === draggedCardId
              const shift = draggedCardId ? getCardShift({
                index,
                cardId: card.id,
                cards,
                draggedCardId,
                dragSourceColumnId,
                draggedHeight,
                dropTarget,
                columnId: column.id,
              }) : 0

              return (
                <div
                  key={card.id}
                  className="relative"
                  data-role="card-wrapper"
                  data-card-id={card.id}
                  data-shift={shift || undefined}
                  style={{
                    opacity: isBeingDragged ? 0.15 : undefined,
                    pointerEvents: isBeingDragged ? 'none' as const : undefined,
                    transform: shift ? `translateY(${shift}px)` : undefined,
                    transition: isActivelyDragging ? 'transform 150ms ease' : 'none',
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
            {cards.length === 0 && (!dropTarget || dropTarget.columnId !== column.id) && (
              <div className="border border-dashed border-black bg-black/5 p-4 text-center text-[12px] font-bold text-text-subtle uppercase">
                {isFiltering ? 'No tasks match filters' : 'No items'}
              </div>
            )}
          </div>
        )}
        <div className="shrink-0 pt-6">
          {isAddingTask ? (
            <Input
              ref={inputRef}
              className="font-heading text-[13px] font-extrabold tracking-wider uppercase shadow-brutal-md"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmit()
                if (e.key === 'Escape') setIsAddingTask(false)
              }}
            />
          ) : (
            <Button fullWidth onClick={() => setIsAddingTask(true)}>
              <Plus size={14} /> New
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

BoardColumn.displayName = 'BoardColumn'
