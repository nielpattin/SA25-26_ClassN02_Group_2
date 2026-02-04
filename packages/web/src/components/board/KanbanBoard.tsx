import { useMemo } from 'react'
import { useBoards } from '../../hooks/useBoards'
import { setDragging as setGlobalDragging } from '../../hooks/useBoardSocket'
import type { TaskWithLabels } from '../../hooks/useTasks'
import { TaskCard } from '../tasks'
import { BoardColumn } from '../columns'
import {
  useDragContext,
  useDragHandlers,
  ColumnGhost,
  CardGhost,
  type ColumnDropResult,
  type CardDropResult,
} from '../dnd'
import { Input } from '../ui/Input'

type Column = { id: string; name: string; position: string; boardId: string }

export type KanbanBoardProps = {
  boardId: string
  serverColumns: Column[]
  allCards: TaskWithLabels[]
  filteredCards: TaskWithLabels[]
  newColumnName: string
  setNewColumnName: (name: string) => void
  createColumn: { mutate: (input: { name: string; boardId: string }) => void }
  onCardClick: (id: string) => void
  onAddTask: (columnId: string, title: string) => void | Promise<void>
  onRenameColumn: (columnId: string, newName: string) => void
  onArchiveColumn: (columnId: string) => void
  onCopyColumn: (columnId: string) => void
  onMoveColumnToBoard: (columnId: string, targetBoardId: string) => void
  onColumnDrop: (result: ColumnDropResult<Column>) => void
  onCardDrop: (result: CardDropResult) => void
  isFiltering: boolean
}

export function KanbanBoard({
  boardId,
  serverColumns,
  allCards,
  filteredCards,
  newColumnName,
  setNewColumnName,
  createColumn,
  onCardClick,
  onAddTask,
  onRenameColumn,
  onArchiveColumn,
  onCopyColumn,
  onMoveColumnToBoard,
  onColumnDrop,
  onCardDrop,
  isFiltering,
}: KanbanBoardProps) {
  const { data: allBoards = [] } = useBoards()
  const {
    draggedColumnId,
    draggedCardId,
    draggedCardData,
    localColumns,
    dropTarget,
    isScrolling,
    isAnyDragging,
    scrollContainerRef,
    ghostRef,
    cardGhostRef,
  } = useDragContext<Column, TaskWithLabels>()

  const displayColumns = draggedColumnId ? localColumns : serverColumns

  const cardsByColumn = useMemo(() => {
    const map: Record<string, TaskWithLabels[]> = {}
    displayColumns.forEach(col => {
      map[col.id] = []
    })
    filteredCards.forEach(card => {
      if (map[card.columnId]) map[card.columnId].push(card)
    })
    return map
  }, [displayColumns, filteredCards])

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleColumnDragStart,
    handleCardDragStart,
  } = useDragHandlers<Column, TaskWithLabels>({
    serverColumns,
    allCards,
    onDragStart: () => setGlobalDragging(true),
    onColumnDrop,
    onCardDrop,
  })

  const draggedColumn = draggedColumnId
    ? displayColumns.find(c => c.id === draggedColumnId)
    : null

  return (
    <>
      <div
        className={`flex flex-1 cursor-grab items-start gap-(--board-gap,24px) overflow-x-auto overflow-y-hidden bg-canvas px-16 py-12 ${isScrolling || draggedColumnId || draggedCardId ? 'cursor-grabbing' : ''}`}
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {displayColumns.map(column => (
          <BoardColumn
            key={column.id}
            column={column}
            cards={cardsByColumn[column.id] || []}
            onCardClick={onCardClick}
            onDragStart={handleColumnDragStart}
            onCardDragStart={handleCardDragStart}
            onAddTask={onAddTask}
            onRenameColumn={onRenameColumn}
            onArchiveColumn={onArchiveColumn}
            onCopyColumn={onCopyColumn}
            onMoveColumnToBoard={onMoveColumnToBoard}
            boards={allBoards}
            isDragging={column.id === draggedColumnId}
            draggedCardId={draggedCardId}
            isAnyDragging={isAnyDragging}
            isFiltering={isFiltering}
            dropTarget={dropTarget}
          />
        ))}
        <div
          className={`w-(--board-column-width,300px) min-w-(--board-column-width,300px) shrink-0 px-1 ${isAnyDragging ? 'pointer-events-none' : ''}`}
        >
          <Input
            className="font-heading text-[13px] font-extrabold tracking-wider uppercase shadow-brutal-md hover:-translate-px hover:shadow-brutal-xl! focus:bg-accent focus:shadow-brutal-lg"
            placeholder="+ Add a group"
            value={newColumnName}
            onChange={e => setNewColumnName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newColumnName) {
                createColumn.mutate({ name: newColumnName, boardId })
                setNewColumnName('')
              }
            }}
          />
        </div>
      </div>

      {draggedColumn && (
        <ColumnGhost
          ref={ghostRef}
          name={draggedColumn.name}
          cardCount={cardsByColumn[draggedColumn.id]?.length || 0}
        />
      )}

      {draggedCardData && (
        <CardGhost ref={cardGhostRef}>
          <TaskCard task={draggedCardData} onTaskClick={() => {}} isAnyDragging={isAnyDragging} />
        </CardGhost>
      )}
    </>
  )
}
