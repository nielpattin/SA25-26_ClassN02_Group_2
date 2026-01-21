import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { useBoardSocket, setDragging as setGlobalDragging } from '../hooks/useBoardSocket'
import { useBoard, useBoards } from '../hooks/useBoards'
import {
  useColumns,
  useCreateColumn,
  useRenameColumn,
  useArchiveColumn,
  useCopyColumn,
  useMoveColumnToBoard,
  columnKeys,
} from '../hooks/useColumns'
import { useTasks, useCreateTask, type TaskWithLabels, taskKeys } from '../hooks/useTasks'
import { CardModal, TaskCard } from '../components/tasks'
import { BoardColumn } from '../components/columns'
import { WorkspaceProvider } from '../context/WorkspaceContext'
import {
  DragProvider,
  useDragContext,
  useDragHandlers,
  ColumnGhost,
  CardGhost,
  type ColumnDropResult,
  type CardDropResult,
} from '../components/dnd'
import { Input } from '../components/ui/Input'

type Column = { id: string; name: string; position: string; boardId: string }

type BoardSearch = { cardId?: string }

export const Route = createFileRoute('/board/$boardId')({
  component: BoardComponent,
  validateSearch: (search: Record<string, unknown>): BoardSearch => ({
    cardId: (search.cardId as string) || undefined,
  }),
})

function BoardComponent() {
  const { boardId } = Route.useParams()
  const { cardId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cardId ?? null)

  // Sync URL cardId param to local state (intentional URL -> state sync)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cardId && cardId !== selectedCardId) setSelectedCardId(cardId)
  }, [cardId, selectedCardId])

  const handleCloseModal = () => {
    setSelectedCardId(null)
    navigate({
      search: prev => {
        const rest = { ...prev }
        delete rest.cardId
        return rest
      },
      replace: true,
    })
  }

  // Data Fetching via hooks
  useBoardSocket(boardId)
  const { data: board, isLoading: boardLoading } = useBoard(boardId)
  const { data: serverColumns = [], isLoading: columnsLoading } = useColumns(boardId)
  const { data: allCards = [] } = useTasks(boardId)
  const createTask = useCreateTask(boardId)
  const createColumn = useCreateColumn()
  const renameColumn = useRenameColumn(boardId)
  const archiveColumn = useArchiveColumn(boardId)
  const copyColumn = useCopyColumn(boardId)
  const moveColumnToBoard = useMoveColumnToBoard(boardId)

  // Column action handlers
  const handleAddTask = useCallback(
    (columnId: string, title: string) => {
      createTask.mutate({ title, columnId })
    },
    [createTask]
  )

  const handleRenameColumn = useCallback(
    (columnId: string, newName: string) => {
      renameColumn.mutate({ columnId, name: newName })
    },
    [renameColumn]
  )

  const handleArchiveColumn = useCallback(
    (columnId: string) => {
      archiveColumn.mutate(columnId)
    },
    [archiveColumn]
  )

  const handleCopyColumn = useCallback(
    (columnId: string) => {
      copyColumn.mutate(columnId)
    },
    [copyColumn]
  )

  const handleMoveColumnToBoard = useCallback(
    (columnId: string, targetBoardId: string) => {
      moveColumnToBoard.mutate({ columnId, targetBoardId })
    },
    [moveColumnToBoard]
  )

  // Drop handlers for API persistence
  const handleColumnDrop = useCallback(
    (result: ColumnDropResult<Column>) => {
      const { columnId, finalColumns, placeholderIndex } = result
      queryClient.setQueryData(columnKeys.list(boardId), finalColumns)
      const beforeCol = finalColumns[placeholderIndex - 1]
      const afterCol = finalColumns[placeholderIndex + 1]
      api.v1
        .columns({ id: columnId })
        .move.patch({ beforeColumnId: beforeCol?.id, afterColumnId: afterCol?.id })
        .then(() => queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) }))
        .catch(() => queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) }))
      setGlobalDragging(false)
    },
    [boardId, queryClient]
  )

  const handleCardDrop = useCallback(
    (result: CardDropResult<TaskWithLabels>) => {
      const { cardId: droppedCardId, finalCards, droppedCard } = result
      queryClient.setQueryData(taskKeys.list(boardId), finalCards)
      const colCards = finalCards.filter(c => c.columnId === droppedCard.columnId)
      const inColIdx = colCards.indexOf(droppedCard)
      api.v1
        .tasks({ id: droppedCardId })
        .move.patch({
          columnId: droppedCard.columnId,
          beforeTaskId: colCards[inColIdx - 1]?.id,
          afterTaskId: colCards[inColIdx + 1]?.id,
        })
        .then(() => queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) }))
        .catch(() => queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) }))
      setGlobalDragging(false)
    },
    [boardId, queryClient]
  )

  if (boardLoading || columnsLoading) {
    return (
      <div className="font-heading bg-canvas flex h-screen items-center justify-center font-extrabold text-black uppercase">
        Loading workspace...
      </div>
    )
  }

  if (!board) {
    return (
      <div className="font-heading bg-canvas flex h-screen items-center justify-center font-extrabold text-black uppercase">
        Error: Page not found
      </div>
    )
  }

  return (
    <WorkspaceProvider>
      <DragProvider>
        <div className="bg-canvas font-body color-text flex h-screen flex-col overflow-hidden p-0">
          <header className="bg-canvas flex shrink-0 items-center justify-between border-b border-black px-6 py-4">
            <div className="flex items-center gap-3">
              <Link
                to="/boards"
                className="hover:bg-accent hover:shadow-brutal-sm text-sm font-extrabold text-black uppercase hover:px-1"
              >
                Workspace
              </Link>
              <ChevronRight size={14} className="text-text-muted" />
              <h1 className="font-heading m-0 text-[18px] font-bold text-black">{board.name}</h1>
            </div>
          </header>

          <BoardContent
            boardId={boardId}
            serverColumns={serverColumns}
            allCards={allCards}
            newColumnName={newColumnName}
            setNewColumnName={setNewColumnName}
            createColumn={createColumn}
            onCardClick={setSelectedCardId}
            onAddTask={handleAddTask}
            onRenameColumn={handleRenameColumn}
            onArchiveColumn={handleArchiveColumn}
            onCopyColumn={handleCopyColumn}
            onMoveColumnToBoard={handleMoveColumnToBoard}
            onColumnDrop={handleColumnDrop}
            onCardDrop={handleCardDrop}
          />

          {selectedCardId && (
            <CardModal cardId={selectedCardId} boardId={boardId} onClose={handleCloseModal} />
          )}
        </div>
      </DragProvider>
    </WorkspaceProvider>
  )
}

type BoardContentProps = {
  boardId: string
  serverColumns: Column[]
  allCards: TaskWithLabels[]
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
  onCardDrop: (result: CardDropResult<TaskWithLabels>) => void
}

function BoardContent({
  boardId,
  serverColumns,
  allCards,
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
}: BoardContentProps) {
  const { data: allBoards = [] } = useBoards()
  const {
    draggedColumnId,
    draggedCardId,
    draggedCardData,
    localColumns,
    localCards,
    isScrolling,
    isAnyDragging,
    scrollContainerRef,
    ghostRef,
    cardGhostRef,
  } = useDragContext<Column, TaskWithLabels>()

  const displayColumns = draggedColumnId ? localColumns : serverColumns
  const displayCards = draggedCardId ? localCards : allCards

  const cardsByColumn = useMemo(() => {
    const map: Record<string, TaskWithLabels[]> = {}
    displayColumns.forEach(col => {
      map[col.id] = []
    })
    displayCards.forEach(card => {
      if (map[card.columnId]) map[card.columnId].push(card)
    })
    return map
  }, [displayColumns, displayCards])

  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUpOrLeave,
    handleColumnDragStart,
    handleCardDragStart,
  } = useDragHandlers<Column, TaskWithLabels>({
    serverColumns,
    allCards,
    displayColumns,
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
        className={`bg-canvas flex flex-1 cursor-grab items-start gap-(--board-gap,24px) overflow-x-auto overflow-y-hidden px-16 py-12 ${isScrolling || draggedColumnId || draggedCardId ? 'cursor-grabbing' : ''}`}
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
          />
        ))}
        <div
          className={`w-(--board-column-width,300px) min-w-(--board-column-width,300px) shrink-0 px-1 ${isAnyDragging ? 'pointer-events-none' : ''}`}
        >
          <Input
            className="shadow-brutal-md font-heading hover:shadow-brutal-xl! focus:bg-accent focus:shadow-brutal-lg text-[13px] font-extrabold tracking-wider uppercase hover:-translate-px"
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
