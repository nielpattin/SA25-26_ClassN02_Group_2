import { createFileRoute, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { ChevronRight, Archive, Download, Kanban, Calendar } from 'lucide-react'
import { useBoardSocket, setDragging as setGlobalDragging } from '../hooks/useBoardSocket'
import { useBoard, useBoards } from '../hooks/useBoards'
import { CalendarView } from '../components/calendar/CalendarView'
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
import { useRecordBoardVisit } from '../hooks/useRecentBoards'
import { useSearchModal } from '../context/SearchContext'
import { useBoardFilters } from '../hooks/useBoardFilters'
import { filterTasks } from '../hooks/filterTasks'
import { useLabels } from '../hooks/useLabels'
import { useBoardMembers } from '../hooks/useAssignees'
import { CardModal, TaskCard } from '../components/tasks'
import { BoardColumn } from '../components/columns'
import { ArchivePanel } from '../components/board/ArchivePanel'
import { ExportBoardModal } from '../components/board/ExportBoardModal'
import { WorkspaceProvider } from '../context/WorkspaceContext'
import { SearchTrigger } from '../components/search'
import { BoardFilterBar } from '../components/filters'
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
import { Dropdown } from '../components/ui/Dropdown'
import { MoreHorizontal } from 'lucide-react'

type Column = { id: string; name: string; position: string; boardId: string }

type BoardSearch = { cardId?: string; view?: 'kanban' | 'calendar'; calendarMode?: 'day' | 'week' | 'month' }

export const Route = createFileRoute('/board/$boardId')({
  component: BoardComponent,
  validateSearch: (search: Record<string, unknown>): BoardSearch => ({
    cardId: (search.cardId as string) || undefined,
    view: (['kanban', 'calendar'].includes(search.view as string)
      ? (search.view as 'kanban' | 'calendar')
      : undefined),
    calendarMode: (['day', 'week', 'month'].includes(search.calendarMode as string)
      ? (search.calendarMode as 'day' | 'week' | 'month')
      : undefined),
  }),
})

function BoardComponent() {
  const { boardId } = Route.useParams()
  const { cardId, view, calendarMode } = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(cardId ?? null)
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)

  // Keep modal state in sync with URL
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedCardId(cardId ?? null)
  }, [cardId])

  // Handle view preference in localStorage
  useEffect(() => {
    if (!view) {
      const savedView = localStorage.getItem(`board:${boardId}:view`) as 'kanban' | 'calendar' | null
      const targetView = savedView === 'calendar' ? 'calendar' : 'kanban'
      navigate({
        search: prev => ({ ...prev, view: targetView }),
        replace: true,
      })
    } else {
      localStorage.setItem(`board:${boardId}:view`, view)
    }
  }, [boardId, view, navigate])

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

  const handleTaskClick = useCallback(
    (id: string) => {
      setSelectedCardId(id)
      navigate({
        search: prev => ({ ...prev, cardId: id }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleCalendarModeChange = useCallback(
    (mode: 'day' | 'week' | 'month') => {
      navigate({
        search: prev => ({ ...prev, calendarMode: mode }),
        replace: true,
      })
    },
    [navigate]
  )

  // Data Fetching via hooks
  useBoardSocket(boardId)
  const { data: board, isLoading: boardLoading } = useBoard(boardId)
  const { data: serverColumns = [], isLoading: columnsLoading } = useColumns(boardId)
  const { data: allCards = [] } = useTasks(boardId)
  const { data: labels = [] } = useLabels(boardId)
  const { data: members = [] } = useBoardMembers(boardId)
  const createTask = useCreateTask(boardId)
  const createColumn = useCreateColumn()
  const renameColumn = useRenameColumn(boardId)
  const archiveColumn = useArchiveColumn(boardId)
  const copyColumn = useCopyColumn(boardId)
  const moveColumnToBoard = useMoveColumnToBoard(boardId)
  const recordVisit = useRecordBoardVisit()
  const { setBoardContext } = useSearchModal()

  // Filtering
  const {
    filters,
    pendingFilters,
    setLabelIds,
    setAssigneeIds,
    setDueDate,
    applyFilters,
    clearFilters,
    hasActiveFilters,
    hasPendingChanges,
  } = useBoardFilters(boardId)

  const filteredCards = useMemo(() => filterTasks(allCards, filters), [allCards, filters])

  const handleLabelToggle = useCallback(
    (labelId: string) => {
      const current = pendingFilters.labelIds
      const next = current.includes(labelId) ? current.filter(id => id !== labelId) : [...current, labelId]
      setLabelIds(next)
    },
    [pendingFilters.labelIds, setLabelIds]
  )

  const handleAssigneeToggle = useCallback(
    (userId: string) => {
      const current = pendingFilters.assigneeIds
      const next = current.includes(userId) ? current.filter(id => id !== userId) : [...current, userId]
      setAssigneeIds(next)
    },
    [pendingFilters.assigneeIds, setAssigneeIds]
  )

  // Record board visit for recent boards feature
  useEffect(() => {
    if (boardId) {
      recordVisit.mutate(boardId)
    }
  }, [boardId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Set board context for search modal (enables per-board search)
  useEffect(() => {
    if (board) {
      setBoardContext({ id: board.id, name: board.name })
    }
    return () => setBoardContext(null)
  }, [board, setBoardContext])

  // Column action handlers
  const handleAddTask = useCallback(
    (columnId: string, title: string, dueDate?: string) => {
      createTask.mutate({ title, columnId, dueDate })
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
          <header className="bg-canvas flex shrink-0 items-center justify-between gap-4 border-b border-black px-6 py-4">
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
            <div className="flex items-center gap-4">
              <BoardFilterBar
                pendingFilters={pendingFilters}
                labels={labels}
                members={members}
                hasActiveFilters={hasActiveFilters}
                hasPendingChanges={hasPendingChanges}
                onLabelToggle={handleLabelToggle}
                onAssigneeToggle={handleAssigneeToggle}
                onDueDateChange={setDueDate}
                onApply={applyFilters}
                onClear={clearFilters}
              />
              <div className="shadow-brutal-sm flex items-center gap-0 border border-black bg-white">
                <button
                  onClick={() =>
                    navigate({
                      search: prev => ({ ...prev, view: 'kanban' }),
                      replace: true,
                    })
                  }
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center transition-all ${
                    (view || 'kanban') === 'kanban' ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  title="Kanban View"
                >
                  <Kanban size={18} />
                </button>
                <div className="h-9 w-px bg-black" />
                <button
                  onClick={() =>
                    navigate({
                      search: prev => ({ ...prev, view: 'calendar' }),
                      replace: true,
                    })
                  }
                  className={`flex h-9 w-9 cursor-pointer items-center justify-center transition-all ${
                    view === 'calendar' ? 'bg-accent' : 'hover:bg-accent/50'
                  }`}
                  title="Calendar View"
                >
                  <Calendar size={18} />
                </button>
              </div>
              <button
                onClick={() => setIsArchiveOpen(true)}
                className="hover:bg-accent shadow-brutal-sm flex h-9 w-9 cursor-pointer items-center justify-center border border-black bg-white transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-none"
                title="Open Archive"
              >
                <Archive size={18} />
              </button>
              <Dropdown
                trigger={
                  <button className="hover:bg-accent shadow-brutal-sm flex h-9 w-9 cursor-pointer items-center justify-center border border-black bg-white transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-none">
                    <MoreHorizontal size={18} />
                  </button>
                }
                items={[
                  {
                    label: 'Export Board',
                    icon: <Download size={16} />,
                    onClick: () => setIsExportOpen(true),
                  },
                ]}
              />
              <SearchTrigger />
            </div>
          </header>

          {view === 'calendar' ? (
            <CalendarView
              boardId={boardId}
              tasks={filteredCards}
              columns={serverColumns}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
              viewMode={calendarMode || 'month'}
              onViewModeChange={handleCalendarModeChange}
            />
          ) : (
            <BoardContent
              boardId={boardId}
              serverColumns={serverColumns}
              allCards={filteredCards}
              newColumnName={newColumnName}
              setNewColumnName={setNewColumnName}
              createColumn={createColumn}
              onCardClick={handleTaskClick}
              onAddTask={handleAddTask}
              onRenameColumn={handleRenameColumn}
              onArchiveColumn={handleArchiveColumn}
              onCopyColumn={handleCopyColumn}
              onMoveColumnToBoard={handleMoveColumnToBoard}
              onColumnDrop={handleColumnDrop}
              onCardDrop={handleCardDrop}
              isFiltering={hasActiveFilters}
            />
          )}

          {selectedCardId && (
            <CardModal cardId={selectedCardId} boardId={boardId} onClose={handleCloseModal} />
          )}

          <ArchivePanel
            isOpen={isArchiveOpen}
            onClose={() => setIsArchiveOpen(false)}
            boardId={boardId}
          />

          <ExportBoardModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            boardId={boardId}
            boardName={board.name}
          />
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
  isFiltering: boolean
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
  isFiltering,
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
            isFiltering={isFiltering}
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
