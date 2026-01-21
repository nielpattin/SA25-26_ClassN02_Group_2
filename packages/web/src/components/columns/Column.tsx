import { memo, useRef, useLayoutEffect, useState, type ReactNode } from 'react'
import { Plus, Pencil, Copy, Archive, ExternalLink } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { ColumnHeader } from './ColumnHeader'
import type { DropdownItem } from '../Dropdown'

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

export type ColumnProps = {
  column: ColumnData
  cardCount: number
  children: ReactNode
  onDragStart: (e: React.MouseEvent) => void
  onAddTask: (columnId: string, title: string) => Promise<void>
  onRenameColumn: (columnId: string, newName: string) => Promise<void>
  onArchiveColumn: (columnId: string) => Promise<void>
  onCopyColumn: (columnId: string) => Promise<void>
  onMoveColumnToBoard: (columnId: string, targetBoardId: string) => Promise<void>
  boards: BoardRef[]
  isDragging?: boolean
  isAnyDragging: boolean
}

export const Column = memo(function Column({
  column,
  cardCount,
  children,
  onDragStart,
  onAddTask,
  onRenameColumn,
  onArchiveColumn,
  onCopyColumn,
  onMoveColumnToBoard,
  boards,
  isDragging = false,
  isAnyDragging,
}: ColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (isAddingTask) {
      inputRef.current?.focus()
    }
  }, [isAddingTask])

  const handleSubmit = async () => {
    if (newTaskTitle.trim()) {
      await onAddTask(column.id, newTaskTitle.trim())
      setNewTaskTitle('')
    }
    setIsAddingTask(false)
  }

  const handleRename = (newName: string) => {
    onRenameColumn(column.id, newName)
  }

  const menuItems: DropdownItem[] = [
    { label: 'Add Card', icon: <Plus size={14} />, onClick: () => setIsAddingTask(true) },
    { label: 'Rename List', icon: <Pencil size={14} />, onClick: () => {} }, // ColumnHeader handles editing
    { label: 'Copy List', icon: <Copy size={14} />, onClick: () => onCopyColumn(column.id) },
    {
      label: 'Archive',
      icon: <Archive size={14} />,
      onClick: () => onArchiveColumn(column.id),
      variant: 'danger' as const,
    },
  ]

  // Add Move options for other boards
  const otherBoards = boards.filter(b => b.id !== column.boardId)
  otherBoards.forEach(board => {
    menuItems.push({
      label: `Move to ${board.name}`,
      icon: <ExternalLink size={14} />,
      onClick: () => onMoveColumnToBoard(column.id, board.id),
    })
  })

  return (
    <div
      className={`relative flex max-h-full w-(--board-column-width,300px) min-w-(--board-column-width,300px) flex-col rounded-none border p-4 ${isDragging ? 'translate-0! border-dashed border-black/20 bg-black/5 opacity-100 shadow-none!' : 'bg-surface shadow-brutal-lg -translate-x-px -translate-y-px border-black'} ${isAnyDragging ? 'pointer-events-none' : ''}`}
      data-column-id={column.id}
      data-role="column"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${isDragging ? 'invisible' : ''}`}>
        <div className="column-header-container">
          <ColumnHeader
            name={column.name}
            cardCount={cardCount}
            menuItems={menuItems}
            onDragStart={onDragStart}
            onRename={handleRename}
          />
        </div>
        <div className="flex min-h-5 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-1 pb-3">
          {children}
          {cardCount === 0 && (
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

Column.displayName = 'Column'
