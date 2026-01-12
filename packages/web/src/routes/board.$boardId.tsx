import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link2 } from 'lucide-react'
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview'
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview'
import { attachClosestEdge, extractClosestEdge, type Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge'
import { autoScrollForElements, autoScrollWindowForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element'
import { useBoardSocket } from '../hooks/useBoardSocket'
import { CardModal } from '../components/CardModal'
import { ThemeToggle } from '../components/ThemeToggle'
import { DropIndicator, CardDragPreview, ColumnDragPreview, type CardDragData, type ColumnDragData, isCardData, isColumnData, isCardsListData } from '../components/dnd'
import { generatePosition } from '../utils/position'
import './board.$boardId.css'

export const Route = createFileRoute('/board/$boardId')({
  component: BoardComponent,
})

type Column = { id: string; name: string; position: string }
type CardLabel = { id: string; name: string; color: string }
type ChecklistProgress = { completed: number; total: number }
type Card = {
  id: string
  title: string
  position: string
  columnId: string
  dueDate: string | Date | null
  description?: string | null
  createdAt?: Date | null
  labels?: CardLabel[]
  checklistProgress?: ChecklistProgress | null
  attachmentsCount?: number
}

function BoardComponent() {
  const { boardId } = Route.useParams()
  const queryClient = useQueryClient()
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)

  // Board drag-to-scroll state
  const boardColumnsRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, scrollLeft: 0 })

  useBoardSocket(boardId)

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const { data, error } = await api.boards({ id: boardId }).get()
      if (error) throw error
      return data
    },
  })

  const { data: columns = [], isLoading: columnsLoading } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: async () => {
      const { data, error } = await api.columns.board({ boardId }).get()
      if (error) throw error
      return (data || []).sort((a, b) => a.position.localeCompare(b.position))
    },
  })

  const { data: allCards = [] } = useQuery({
    queryKey: ['cards', boardId],
    queryFn: async () => {
      const { data, error } = await api.tasks.board({ boardId }).enriched.get()
      if (error) throw error
      return (data || []).sort((a, b) => a.position.localeCompare(b.position)) as Card[]
    },
  })

  // Group cards by column
  const cardsByColumn = useMemo(() => {
    const map: Record<string, Card[]> = {}
    columns.forEach(col => {
      map[col.id] = allCards
        .filter(card => card.columnId === col.id)
        .sort((a, b) => a.position.localeCompare(b.position))
    })
    return map
  }, [allCards, columns])

  // Board drag-to-scroll handlers
  const handleBoardMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return

    const target = e.target as HTMLElement
    if (target.closest('.card-item, .column-header, .board-input, button, input, .add-card-container')) return

    const container = boardColumnsRef.current
    if (!container) return

    setIsPanning(true)
    panStartRef.current = {
      x: e.clientX,
      scrollLeft: container.scrollLeft
    }
    container.style.cursor = 'grabbing'
    e.preventDefault()
  }, [])

  useEffect(() => {
    if (!isPanning) return

    const handleMouseMove = (e: MouseEvent) => {
      const container = boardColumnsRef.current
      if (!container) return

      const dx = e.clientX - panStartRef.current.x
      container.scrollLeft = panStartRef.current.scrollLeft - dx
    }

    const handleMouseUp = () => {
      setIsPanning(false)
      const container = boardColumnsRef.current
      if (container) {
        container.style.cursor = ''
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPanning])

  const createColumn = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.columns.post({
        name,
        boardId,
        // position auto-generated by backend
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      setNewColumnName('')
    }
  })

  const moveCard = useMutation({
    mutationFn: async ({ id, columnId, beforeCardId, afterCardId }: { 
      id: string
      columnId?: string
      beforeCardId?: string
      afterCardId?: string 
    }) => {
      const { data, error } = await api.tasks({ id }).move.patch({ 
        columnId, 
        beforeTaskId: beforeCardId, 
        afterTaskId: afterCardId 
      })
      if (error) throw error
      return data
    },
  })

  const moveColumn = useMutation({
    mutationFn: async ({ id, beforeColumnId, afterColumnId }: { 
      id: string
      beforeColumnId?: string
      afterColumnId?: string 
    }) => {
      const { data, error } = await api.columns({ id }).move.patch({ 
        beforeColumnId, 
        afterColumnId 
      })
      if (error) throw error
      return data
    },
  })

  // Handle card drop
  const handleCardDrop = useCallback((sourceData: CardDragData, targetData: Record<string, unknown>) => {
    const { cardId, columnId: sourceColumnId, index: sourceIndex } = sourceData
    
    // Determine target column and position
    let targetColumnId: string
    let targetIndex: number
    
    if (isCardData(targetData)) {
      // Dropping on another card
      targetColumnId = targetData.columnId
      targetIndex = targetData.index
      const edge = extractClosestEdge(targetData)
      if (edge === 'bottom') {
        targetIndex++
      }
    } else if (isCardsListData(targetData)) {
      // Dropping in empty space of column
      targetColumnId = targetData.columnId
      const targetCards = cardsByColumn[targetColumnId] || []
      targetIndex = targetCards.length
    } else {
      return
    }

    // If dropping in same column at same position, do nothing
    if (targetColumnId === sourceColumnId && targetIndex === sourceIndex) {
      return
    }

    // If dropping in same column after itself, adjust index
    if (targetColumnId === sourceColumnId && targetIndex > sourceIndex) {
      targetIndex--
    }

    // Get target column cards (excluding the dragged card)
    const targetCards = (cardsByColumn[targetColumnId] || []).filter(c => c.id !== cardId)
    
    // Calculate new position using fractional indexing
    let beforeCard: Card | undefined
    let afterCard: Card | undefined
    
    if (targetIndex > 0) {
      beforeCard = targetCards[targetIndex - 1]
    }
    if (targetIndex < targetCards.length) {
      afterCard = targetCards[targetIndex]
    }
    
    const newPosition = generatePosition(
      beforeCard?.position ?? null,
      afterCard?.position ?? null
    )

    // Optimistic update
    queryClient.setQueryData(['cards', boardId], (old: Card[] | undefined) => {
      if (!old) return []

      return old.map(c => 
        c.id === cardId 
          ? { ...c, columnId: targetColumnId, position: newPosition }
          : c
      ).sort((a, b) => a.position.localeCompare(b.position))
    })

    // Sync with server using move endpoint
    moveCard.mutate({
      id: cardId,
      columnId: targetColumnId !== sourceColumnId ? targetColumnId : undefined,
      beforeCardId: beforeCard?.id,
      afterCardId: afterCard?.id
    })
  }, [cardsByColumn, boardId, queryClient, moveCard])

  // Handle column drop
  const handleColumnDrop = useCallback((sourceData: ColumnDragData, targetData: ColumnDragData) => {
    const { columnId: sourceColumnId, index: sourceIndex } = sourceData
    const { columnId: targetColumnId, index: targetIndex } = targetData
    
    if (sourceColumnId === targetColumnId) return

    let newIndex = targetIndex
    const edge = extractClosestEdge(targetData)
    if (edge === 'right') {
      newIndex++
    }

    // If dropping after itself, adjust index
    if (newIndex > sourceIndex) {
      newIndex--
    }

    // Calculate new position using fractional indexing
    const sortedColumns = [...columns].sort((a, b) => a.position.localeCompare(b.position))
    const targetColumns = sortedColumns.filter(c => c.id !== sourceColumnId)
    
    let beforeColumn: Column | undefined
    let afterColumn: Column | undefined
    
    if (newIndex > 0) {
      beforeColumn = targetColumns[newIndex - 1]
    }
    if (newIndex < targetColumns.length) {
      afterColumn = targetColumns[newIndex]
    }
    
    const newPosition = generatePosition(
      beforeColumn?.position ?? null,
      afterColumn?.position ?? null
    )

    // Optimistic update
    queryClient.setQueryData(['columns', boardId], (old: Column[] | undefined) => {
      if (!old) return []

      return old.map(c => 
        c.id === sourceColumnId 
          ? { ...c, position: newPosition }
          : c
      ).sort((a, b) => a.position.localeCompare(b.position))
    })

    // Sync with server using move endpoint
    moveColumn.mutate({
      id: sourceColumnId,
      beforeColumnId: beforeColumn?.id,
      afterColumnId: afterColumn?.id
    })
  }, [columns, boardId, queryClient, moveColumn])

  // Global monitor for drag and drop
  useEffect(() => {
    return monitorForElements({
      onDrop({ source, location }) {
        const destination = location.current.dropTargets[0]
        if (!destination) return

        if (isCardData(source.data)) {
          handleCardDrop(source.data as CardDragData, destination.data)
        } else if (isColumnData(source.data) && isColumnData(destination.data)) {
          handleColumnDrop(source.data as ColumnDragData, destination.data as ColumnDragData)
        }
      },
    })
  }, [handleCardDrop, handleColumnDrop])

  // Board auto-scroll
  useEffect(() => {
    const element = boardColumnsRef.current
    if (!element) return

    return combine(
      autoScrollForElements({
        element,
      }),
      autoScrollWindowForElements()
    )
  }, [boardLoading, columnsLoading])

  if (boardLoading || columnsLoading) return <div className="loading-state">Loading board...</div>
  if (!board) return <div className="loading-state">Error: Board not found</div>

  return (
    <div className="board-container">
      <header className="board-header">
        <div className="header-left">
          <div className="header-title-container">
            <Link to="/dashboard" className="back-link">← Dashboard</Link>
            <h1 className="board-title">{board.name}</h1>
          </div>
        </div>
        <div className="header-right">
          <div className="board-input-group">
            <input
              type="text"
              placeholder="New Column"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              className="board-input"
              onKeyDown={(e) => e.key === 'Enter' && newColumnName && createColumn.mutate(newColumnName)}
            />
            <button
              onClick={() => newColumnName && createColumn.mutate(newColumnName)}
              className="btn-kyte-primary"
            >
              {createColumn.isPending ? 'Adding...' : 'Add Column'}
            </button>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div
        className={`board-columns ${isPanning ? 'panning' : ''}`}
        ref={boardColumnsRef}
        onMouseDown={handleBoardMouseDown}
      >
        {columns.map((column, index) => (
          <BoardColumn
            key={column.id}
            column={column}
            index={index}
            cards={cardsByColumn[column.id] || []}
            onCardClick={setSelectedCardId}
          />
        ))}
      </div>

      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardId={boardId}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  )
}

function BoardColumn({
  column,
  index,
  cards,
  onCardClick,
}: {
  column: Column
  index: number
  cards: Card[]
  onCardClick: (id: string) => void
}) {
  const queryClient = useQueryClient()
  const columnRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLHeadingElement>(null)
  const cardsListRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const addCardContainerRef = useRef<HTMLDivElement>(null)
  
  const [newCardTitle, setNewCardTitle] = useState('')
  const [isAddingCard, setIsAddingCard] = useState(false)
  const [columnDragState, setColumnDragState] = useState<'idle' | 'dragging'>('idle')
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
  const [isCardDropTarget, setIsCardDropTarget] = useState(false)
  const [previewContainer, setPreviewContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const element = columnRef.current
    const dragHandle = headerRef.current
    const cardsContainer = cardsListRef.current
    
    if (!element || !dragHandle || !cardsContainer) return

    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData: () => ({
          type: 'column',
          columnId: column.id,
          index,
        } satisfies ColumnDragData),
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({ x: '16px', y: '8px' }),
            render({ container }) {
              setPreviewContainer(container)
              return () => setPreviewContainer(null)
            },
          })
        },
        onDragStart() {
          setColumnDragState('dragging')
        },
        onDrop() {
          setColumnDragState('idle')
        },
      }),
      dropTargetForElements({
        element,
        getData({ input }) {
          return attachClosestEdge(
            {
              type: 'column',
              columnId: column.id,
              index,
            },
            {
              element,
              input,
              allowedEdges: ['left', 'right'],
            }
          )
        },
        canDrop({ source }) {
          return source.data.type === 'column' && source.data.columnId !== column.id
        },
        onDragEnter({ self, source }) {
          if (source.data.type === 'column') {
            const edge = extractClosestEdge(self.data)
            setClosestEdge(edge)
          }
        },
        onDrag({ self, source }) {
          if (source.data.type === 'column') {
            const edge = extractClosestEdge(self.data)
            setClosestEdge(edge)
          }
        },
        onDragLeave({ source }) {
          if (source.data.type === 'column') {
            setClosestEdge(null)
          }
        },
        onDrop({ source }) {
          if (source.data.type === 'column') {
            setClosestEdge(null)
          }
        },
      }),
      dropTargetForElements({
        element: cardsContainer,
        getData() {
          return {
            type: 'cards-list',
            columnId: column.id,
          }
        },
        canDrop({ source }) {
          return source.data.type === 'card'
        },
        onDragEnter() {
          setIsCardDropTarget(true)
        },
        onDragLeave() {
          setIsCardDropTarget(false)
        },
        onDrop() {
          setIsCardDropTarget(false)
        },
      }),
      autoScrollForElements({
        element: cardsContainer,
      })
    )
  }, [column.id, index])

  const createCard = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await api.tasks.post({
        title,
        columnId: column.id,
        // position auto-generated by backend
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
      setNewCardTitle('')
      setIsAddingCard(false)
    }
  })

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      createCard.mutate(newCardTitle.trim())
    }
  }

  const handleCancel = () => {
    setNewCardTitle('')
    setIsAddingCard(false)
  }

  useEffect(() => {
    if (isAddingCard && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAddingCard])

  useEffect(() => {
    if (!isAddingCard) return

    const handleClickOutside = (e: MouseEvent) => {
      if (addCardContainerRef.current && !addCardContainerRef.current.contains(e.target as Node)) {
        handleCancel()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isAddingCard])

  const hasCards = cards.length > 0

  return (
    <>
      <div ref={columnRef} className={`board-column ${columnDragState === 'dragging' ? 'column-dragging' : ''}`}>
        <h4 ref={headerRef} className="column-header">
          {column.name}
        </h4>

        <div
          ref={cardsListRef}
          className={`cards-list ${isCardDropTarget ? 'cards-list-over' : ''}`}
        >
          {cards.map((card, cardIndex) => (
            <CardItem
              key={card.id}
              card={card}
              index={cardIndex}
              onClick={() => onCardClick(card.id)}
            />
          ))}
          {!hasCards && (
            <div className="empty-column-placeholder">
              Drop cards here
            </div>
          )}
        </div>

        <div className="add-card-container" ref={addCardContainerRef}>
          {isAddingCard ? (
            <>
              <input
                ref={inputRef}
                type="text"
                placeholder="Enter card title..."
                value={newCardTitle}
                onChange={(e) => setNewCardTitle(e.target.value)}
                className="card-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCard()
                  if (e.key === 'Escape') handleCancel()
                }}
              />
              <div className="add-card-actions">
                <button
                  onClick={handleAddCard}
                  className="btn-add-card"
                  disabled={!newCardTitle.trim() || createCard.isPending}
                >
                  {createCard.isPending ? 'Adding...' : 'Add'}
                </button>
                <button onClick={handleCancel} className="btn-cancel-card">
                  ✕
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setIsAddingCard(true)}
              className="btn-add-card"
            >
              + Add Card
            </button>
          )}
        </div>
        {closestEdge && <DropIndicator edge={closestEdge} gap={8} />}
      </div>
      {previewContainer && createPortal(
        <ColumnDragPreview name={column.name} cardCount={cards.length} />,
        previewContainer
      )}
    </>
  )
}

function CardItem({
  card,
  index,
  onClick,
}: {
  card: Card
  index: number
  onClick: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [dragState, setDragState] = useState<'idle' | 'dragging'>('idle')
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
  const [previewContainer, setPreviewContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    return combine(
      draggable({
        element,
        getInitialData: () => ({
          type: 'card',
          cardId: card.id,
          columnId: card.columnId,
          index,
        } satisfies CardDragData),
        onGenerateDragPreview({ nativeSetDragImage }) {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: pointerOutsideOfPreview({ x: '16px', y: '8px' }),
            render({ container }) {
              setPreviewContainer(container)
              return () => setPreviewContainer(null)
            },
          })
        },
        onDragStart() {
          setDragState('dragging')
        },
        onDrop() {
          setDragState('idle')
        },
      }),
      dropTargetForElements({
        element,
        getData({ input }) {
          return attachClosestEdge(
            {
              type: 'card',
              cardId: card.id,
              columnId: card.columnId,
              index,
            },
            {
              element,
              input,
              allowedEdges: ['top', 'bottom'],
            }
          )
        },
        canDrop({ source }) {
          return source.data.type === 'card'
        },
        onDragEnter({ self }) {
          const edge = extractClosestEdge(self.data)
          setClosestEdge(edge)
        },
        onDrag({ self }) {
          const edge = extractClosestEdge(self.data)
          setClosestEdge(edge)
        },
        onDragLeave() {
          setClosestEdge(null)
        },
        onDrop() {
          setClosestEdge(null)
        },
      })
    )
  }, [card.id, card.columnId, index])

  const getDueDateClass = () => {
    if (!card.dueDate) return ''
    const due = new Date(card.dueDate)
    const now = new Date()
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < 0) return 'overdue'
    if (diffDays <= 2) return 'due-soon'
    return ''
  }

  return (
    <>
      <div
        ref={ref}
        data-card-id={card.id}
        className={`card-item ${dragState === 'dragging' ? 'card-dragging' : ''}`}
        onClick={onClick}
      >
        <div className="card-item-content">
          {card.labels && card.labels.length > 0 && (
            <div className="card-labels">
              {card.labels.map(label => (
                <span
                  key={label.id}
                  className="card-label-pill"
                  style={{ backgroundColor: label.color, color: '#fff' }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
          <div className="card-item-title">
            {card.title}
          </div>
          {(card.dueDate || (card.checklistProgress && card.checklistProgress.total > 0) || (card.attachmentsCount && card.attachmentsCount > 0)) && (
            <div className="card-meta">
              {card.checklistProgress && card.checklistProgress.total > 0 && (
                <span className={`card-checklist-progress ${card.checklistProgress.completed === card.checklistProgress.total ? 'completed' : ''}`}>
                  ✓ {card.checklistProgress.completed}/{card.checklistProgress.total}
                </span>
              )}
              {card.attachmentsCount && card.attachmentsCount > 0 ? (
                <span className="card-attachments-count">
                  <Link2 size={10} style={{ marginRight: '2px' }} />
                  {card.attachmentsCount}
                </span>
              ) : null}
              {card.dueDate && (
                <span className={`card-due-date ${getDueDateClass()}`}>
                  {new Date(card.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>
        {closestEdge && <DropIndicator edge={closestEdge} gap={4} />}
      </div>
      {previewContainer && createPortal(
        <CardDragPreview title={card.title} labels={card.labels} />,
        previewContainer
      )}
    </>
  )
}
