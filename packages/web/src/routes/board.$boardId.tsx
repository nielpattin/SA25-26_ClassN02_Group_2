import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { generateKeyBetween } from 'fractional-indexing'
import { PublishTemplateModal } from '../components/board/PublishTemplateModal'
import { useBoardFiltersStore } from '../store/boardViewStore'
import { useBoardSocket } from '../hooks/useBoardSocket'
import { useDragStore } from '../store/dragStore'
import { useBoard } from '../hooks/useBoards'
import {
  useBoardPreferences,
  useSaveBoardPreferences,
  type ViewMode,
  type ZoomMode,
} from '../hooks/useBoardPreferences'
import { CalendarView } from '../components/calendar/CalendarView'
import { GanttView } from '../components/gantt/GanttView'
import {
  useColumns,
  useCreateColumn,
  useRenameColumn,
  useArchiveColumn,
  useCopyColumn,
  useMoveColumnToBoard,
  useMoveColumn,
} from '../hooks/useColumns'
import { useTasks, useCreateTask, useMoveTask, type TaskWithLabels } from '../hooks/useTasks'
import { useRecordBoardVisit } from '../hooks/useRecentBoards'
import { useSearchModal } from '../context/SearchContext'
import { filterTasks } from '../hooks/filterTasks'
import { useLabels } from '../hooks/useLabels'
import { useBoardMembers, type BoardMember } from '../hooks/useAssignees'
import { useSession } from '../api/auth'
import { CardModal } from '../components/tasks'
import { ArchivePanel } from '../components/board/ArchivePanel'
import { ExportBoardModal } from '../components/board/ExportBoardModal'
import { ExportActivityModal } from '../components/board/ExportActivityModal'
import { BoardHeader } from '../components/board/BoardHeader'
import { KanbanBoard } from '../components/board/KanbanBoard'
import { WorkspaceProvider } from '../context/WorkspaceContext'
import { DragProvider } from '../components/dnd'
import type { ColumnDropResult, CardDropResult } from '../components/dnd'

type Column = { id: string; name: string; position: string; boardId: string }

type BoardSearch = {
  cardId?: string
}

export const Route = createFileRoute('/board/$boardId')({
  component: BoardPage,
  validateSearch: (search: Record<string, unknown>): BoardSearch => ({
    cardId: (search.cardId as string) || undefined,
  }),
})

function BoardPage() {
  const { boardId } = Route.useParams()
  const { cardId: urlCardId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const [newColumnName, setNewColumnName] = useState('')

  // Local UI state
  const [isArchiveOpen, setArchiveOpen] = useState(false)
  const [isExportOpen, setExportOpen] = useState(false)
  const [isActivityExportOpen, setActivityExportOpen] = useState(false)
  const [isPublishOpen, setPublishOpen] = useState(false)

  // Fetch preferences from server (source of truth for view/zoom/filters)
  const { data: preferences, isSuccess: prefsLoaded } = useBoardPreferences(boardId)
  const { saveDebounced } = useSaveBoardPreferences(boardId)

  const {
    pendingFilters,
    hasActiveFilters,
    hasPendingChanges,
    setDueDate,
    toggleLabel,
    toggleAssignee,
    clearFilters,
    setPendingFilters,
  } = useBoardFiltersStore(preferences.filters)

  // Sync pending filters when preferences change (initial load)
  const initialized = useRef<string | null>(null)
  useEffect(() => {
    if (prefsLoaded && initialized.current !== boardId) {
      setPendingFilters(preferences.filters)
      initialized.current = boardId
    }
  }, [boardId, preferences.filters, prefsLoaded, setPendingFilters])

  const handleApplyFilters = useCallback(() => {
    saveDebounced({ filters: pendingFilters })
  }, [pendingFilters, saveDebounced])

  const handleClearFilters = useCallback(() => {
    clearFilters()
    saveDebounced({
      filters: {
        labelIds: [],
        assigneeIds: [],
        dueDate: null,
        status: 'active',
      },
    })
  }, [clearFilters, saveDebounced])

  const setView = useCallback(
    (view: ViewMode) => {
      saveDebounced({ view })
    },
    [saveDebounced]
  )

  const setZoomMode = useCallback(
    (zoomMode: ZoomMode) => {
      saveDebounced({ zoomMode })
    },
    [saveDebounced]
  )

  const handleCloseModal = useCallback(() => {
    navigate({
      search: (prev) => {
        const next = { ...prev }
        delete next.cardId
        return next
      },
      replace: true,
    })
  }, [navigate])

  const handleTaskClick = useCallback(
    (id: string) => {
      navigate({
        search: (prev) => ({ ...prev, cardId: id }),
        replace: true,
      })
    },
    [navigate]
  )

  const handleCalendarModeChange = useCallback(
    (mode: ZoomMode) => {
      setZoomMode(mode)
    },
    [setZoomMode]
  )

  // Data Fetching via hooks
  const { presence } = useBoardSocket(boardId)
  const { data: board, isLoading: boardLoading } = useBoard(boardId)
  const { data: serverColumns = [], isLoading: columnsLoading } = useColumns(boardId)
  const { data: allCards = [], isLoading: tasksLoading } = useTasks(boardId)
  const { data: labels = [] } = useLabels(boardId)
  const { data: members = [] } = useBoardMembers(boardId)
  const { data: session } = useSession()
  const createTask = useCreateTask(boardId)
  const createColumn = useCreateColumn()
  const renameColumn = useRenameColumn(boardId)
  const archiveColumn = useArchiveColumn(boardId)
  const copyColumn = useCopyColumn(boardId)
  const moveColumnToBoard = useMoveColumnToBoard(boardId)
  const moveColumn = useMoveColumn(boardId)
  const moveTask = useMoveTask(boardId)
  const recordVisit = useRecordBoardVisit()
  const { setBoardContext } = useSearchModal()

  const viewFilters = useMemo(() => {
    if (preferences.view !== 'kanban') return preferences.filters
    return { ...preferences.filters, status: 'all' as const }
  }, [preferences.filters, preferences.view])

  const filteredCards = useMemo(
    () => filterTasks(allCards, viewFilters, serverColumns),
    [allCards, viewFilters, serverColumns]
  )

  const isKanbanFiltering =
    viewFilters.labelIds.length > 0 ||
    viewFilters.assigneeIds.length > 0 ||
    viewFilters.dueDate !== null

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
  const setIsDragging = useDragStore((state) => state.setDragging)

  const handleColumnDrop = useCallback(
    (result: ColumnDropResult<Column>) => {
      const { columnId, finalColumns, placeholderIndex } = result

      // Calculate authoritative position
      const beforeCol = finalColumns[placeholderIndex - 1]
      const afterCol = finalColumns[placeholderIndex + 1]
      const calculatedPosition = generateKeyBetween(
        beforeCol?.position || null,
        afterCol?.position || null
      )

      // Get current version for conflict detection
      const column = serverColumns.find(c => c.id === columnId)
      const version = column?.version

      // The mutation handles optimistic updates and error rollback
      moveColumn.mutate(
        { columnId, position: calculatedPosition, version },
        {
          onSettled: () => setIsDragging(false)
        }
      )
    },
    [moveColumn, setIsDragging, serverColumns]
  )

  const handleCardDrop = useCallback(
    (result: CardDropResult) => {
      const { cardId: droppedCardId, columnId, beforeCardId, afterCardId } = result

      // Calculate position for optimistic + server authoritative update
      const cardsInTargetColumn = allCards.filter(
        c => (c as TaskWithLabels).columnId === columnId && c.id !== droppedCardId
      )
      let beforePos: string | null = null
      let afterPos: string | null = null

      if (afterCardId) {
        const afterCard = cardsInTargetColumn.find(c => c.id === afterCardId)
        afterPos = afterCard?.position || null
        const idx = cardsInTargetColumn.findIndex(c => c.id === afterCardId)
        if (idx > 0) {
          beforePos = cardsInTargetColumn[idx - 1].position
        }
      } else if (beforeCardId) {
        const beforeCard = cardsInTargetColumn.find(c => c.id === beforeCardId)
        beforePos = beforeCard?.position || null
      } else if (cardsInTargetColumn.length > 0) {
        beforePos = cardsInTargetColumn[cardsInTargetColumn.length - 1].position
      }

      const calculatedPosition = generateKeyBetween(beforePos, afterPos)

      // Get current version for conflict detection
      const task = allCards.find(c => c.id === droppedCardId)
      const version = task?.version

      // The mutation handles optimistic updates and error rollback
      moveTask.mutate(
        { taskId: droppedCardId, columnId, position: calculatedPosition, version },
        {
          onSettled: () => setIsDragging(false)
        }
      )
    },
    [moveTask, setIsDragging, allCards]
  )

  // Check if current user is board admin
  const isBoardAdmin = useMemo(() => {
    if (!session?.user?.id || !members) return false
    const currentUserMember = members.find((m: BoardMember) => m.userId === session.user.id)
    return currentUserMember?.role === 'admin' || board?.ownerId === session.user.id
  }, [session, members, board?.ownerId])

  if (boardLoading || columnsLoading || tasksLoading || !prefsLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas font-heading font-extrabold text-black uppercase">
        Loading workspace...
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas font-heading font-extrabold text-black uppercase">
        Error: Page not found
      </div>
    )
  }

  return (
    <WorkspaceProvider>
      <DragProvider>
        <div className="color-text flex h-screen flex-col overflow-hidden bg-canvas p-0 font-body">
          <BoardHeader
            boardName={board.name}
            presence={presence}
            pendingFilters={pendingFilters}
            labels={labels}
            members={members}
            hasActiveFilters={hasActiveFilters}
            hasPendingChanges={hasPendingChanges}
            currentView={preferences.view || 'kanban'}
            isBoardAdmin={isBoardAdmin}
            onLabelToggle={toggleLabel}
            onAssigneeToggle={toggleAssignee}
            onDueDateChange={setDueDate}
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            onViewChange={setView}
            onOpenArchive={() => setArchiveOpen(true)}
            onOpenExport={() => setExportOpen(true)}
            onOpenActivityExport={() => setActivityExportOpen(true)}
            onOpenPublish={() => setPublishOpen(true)}
          />

          {preferences.view === 'calendar' ? (
            <CalendarView
              boardId={boardId}
              tasks={filteredCards}
              columns={serverColumns}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
              viewMode={preferences.zoomMode || 'month'}
              onViewModeChange={handleCalendarModeChange}
            />
          ) : preferences.view === 'gantt' ? (
            <GanttView
              boardId={boardId}
              tasks={filteredCards}
              onTaskClick={handleTaskClick}
              zoomMode={preferences.zoomMode || 'month'}
              onZoomModeChange={handleCalendarModeChange}
              filters={preferences.filters}
              onFiltersChange={f => saveDebounced({ filters: { ...preferences.filters, ...f } })}
            />
          ) : (
            <KanbanBoard
              boardId={boardId}
              serverColumns={serverColumns}
              allCards={allCards}
              filteredCards={filteredCards}
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
              isFiltering={isKanbanFiltering}
            />
          )}

          {urlCardId && (
            <CardModal cardId={urlCardId} boardId={boardId} onClose={handleCloseModal} />
          )}

          <ArchivePanel
            isOpen={isArchiveOpen}
            onClose={() => setArchiveOpen(false)}
            boardId={boardId}
          />

          <ExportBoardModal
            isOpen={isExportOpen}
            onClose={() => setExportOpen(false)}
            boardId={boardId}
            boardName={board.name}
          />

          {isBoardAdmin && (
            <ExportActivityModal
              isOpen={isActivityExportOpen}
              onClose={() => setActivityExportOpen(false)}
              boardId={boardId}
              boardName={board.name}
            />
          )}

          <PublishTemplateModal
            isOpen={isPublishOpen}
            onClose={() => setPublishOpen(false)}
            boardId={boardId}
            boardName={board.name}
          />
        </div>
      </DragProvider>
    </WorkspaceProvider>
  )
}
