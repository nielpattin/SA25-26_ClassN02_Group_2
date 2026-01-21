import { memo, useState, useRef, useLayoutEffect } from 'react'
import { Plus, MoreHorizontal, Pencil, Copy, Archive, ExternalLink } from 'lucide-react'
import { TaskCard } from '../tasks'
import { Dropdown } from '../Dropdown'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { TaskWithLabels } from '../../hooks/useTasks'

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
  isAnyDragging: boolean
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
  isAnyDragging,
}: BoardColumnProps) {
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
      className={`relative flex max-h-full w-(--board-column-width,300px) min-w-(--board-column-width,300px) flex-col rounded-none border p-4 ${isDragging ? 'translate-0! border-dashed border-black/20 bg-black/5 opacity-100 shadow-none!' : 'bg-surface shadow-brutal-lg -translate-x-px -translate-y-px border-black'} ${isAnyDragging ? 'pointer-events-none' : ''}`}
      data-column-id={column.id}
      data-role="column"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${isDragging ? 'invisible' : ''}`}>
        <h4
          className="font-heading relative mb-5 flex shrink-0 cursor-grab items-center gap-2.5 border-b border-black p-2 text-(length:--column-header-size,14px) font-extrabold tracking-widest text-black uppercase"
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
          <span className="bg-accent ml-auto border border-black px-2 py-0.5 text-[11px] font-extrabold">
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
        <div className="flex min-h-5 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-1 pb-3">
          {cards.map(card => (
            <TaskCard
              key={card.id}
              task={card}
              onTaskClick={onCardClick}
              onTaskDragStart={onCardDragStart}
              isDragging={card.id === draggedCardId}
              isAnyDragging={isAnyDragging}
            />
          ))}
          {cards.length === 0 && (
            <div className="text-text-subtle border border-dashed border-black bg-black/5 p-4 text-center text-[12px] font-bold uppercase">
              No items
            </div>
          )}
        </div>
        <div className="shrink-0 pt-6">
          {isAddingTask ? (
            <Input
              ref={inputRef}
              className="shadow-brutal-md font-heading text-[13px] font-extrabold tracking-wider uppercase"
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
