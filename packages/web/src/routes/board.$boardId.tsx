import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useRef, useLayoutEffect, useMemo, useCallback, memo } from 'react'
import { Plus, MoreHorizontal, ChevronRight, CheckSquare, Copy, ExternalLink, Archive, Pencil } from 'lucide-react'
import { useBoardSocket, setDragging as setGlobalDragging } from '../hooks/useBoardSocket'
import { CardModal } from '../components/CardModal'
import { Dropdown } from '../components/Dropdown'
import './board.$boardId.css'

export const Route = createFileRoute('/board/$boardId')({
  component: BoardComponent,
})

type Column = { id: string; name: string; position: string; boardId: string }
type CardLabel = { id: string; name: string; color: string }
type ChecklistProgress = { completed: number; total: number }
type Board = { id: string; name: string }
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
  
  // Data Fetching
  useBoardSocket(boardId)

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const { data, error } = await api.boards({ id: boardId }).get()
      if (error) throw error
      return data
    },
  })

  const { data: serverColumns = [], isLoading: columnsLoading } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: async () => {
      const { data, error } = await api.columns.board({ boardId }).get()
      if (error) throw error
      return (data || []).sort((a, b) => a.position < b.position ? -1 : a.position > b.position ? 1 : 0)
    },
  })

  const { data: allCards = [] } = useQuery({
    queryKey: ['cards', boardId],
    queryFn: async () => {
      const { data, error } = await api.tasks.board({ boardId }).enriched.get()
      if (error) throw error
      return (data || []).sort((a, b) => a.position < b.position ? -1 : a.position > b.position ? 1 : 0) as Card[]
    },
  })

  const { data: allBoards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await api.boards.get()
      if (error) throw error
      return (data || []) as Board[]
    },
  })

  // Drag State
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [localColumns, setLocalColumns] = useState<Column[]>([])
  const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null)

  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [draggedCardData, setDraggedCardData] = useState<Card | null>(null)
  const [localCards, setLocalCards] = useState<Card[]>([])

  // Derived State
  const displayColumns = draggedColumnId ? localColumns : serverColumns
  const displayCards = draggedCardId ? localCards : allCards

  const cardsByColumn = useMemo(() => {
    const map: Record<string, Card[]> = {}
    displayColumns.forEach(col => {
      map[col.id] = []
    })
    displayCards.forEach(card => {
      if (map[card.columnId]) {
        map[card.columnId].push(card)
      }
    })

    return map
  }, [displayColumns, displayCards])

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const cardGhostRef = useRef<HTMLDivElement>(null)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const cardRects = useRef<{ id: string, columnId: string, top: number, height: number }[]>([])
  const columnRectsForCards = useRef<{ id: string, left: number, right: number, top: number, bottom: number }[]>([])
  const columnMidpoints = useRef<{ mid: number }[]>([])
  const isDraggingCard = useRef(false)
  const pendingCardDrag = useRef<{ card: Card, x: number, y: number, rect: DOMRect } | null>(null)
  const pendingColumnDrag = useRef<{ columnId: string, x: number, y: number, rect: DOMRect } | null>(null)

  const [isScrolling, setIsScrolling] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    if (draggedColumnId && ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${lastMousePos.current.x - dragOffset.x}px, ${lastMousePos.current.y - dragOffset.y}px, 0) rotate(2deg)`
    }
    if (draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${lastMousePos.current.x - dragOffset.x}px, ${lastMousePos.current.y - dragOffset.y}px, 0)`
    }
  }, [draggedColumnId, draggedCardId, dragOffset])

  // Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    
    const target = e.target as HTMLElement
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('.card-item') || 
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('.column-header')
    ) return

    setIsScrolling(true)
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    
    if (pendingCardDrag.current) {
      const { x, y, card, rect } = pendingCardDrag.current
      const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))
      
      if (dist > 5) {
        if (scrollContainerRef.current) {
          const cols = Array.from(scrollContainerRef.current.querySelectorAll('.board-column'))
          columnRectsForCards.current = cols.map((col, i) => {
            const r = col.getBoundingClientRect()
            return {
              id: displayColumns[i].id,
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom
            }
          })

          const items = Array.from(scrollContainerRef.current.querySelectorAll('.card-wrapper'))
          cardRects.current = items.map((item) => {
            const r = item.getBoundingClientRect()
            const id = (item as HTMLElement).dataset.cardId!
            const columnId = (item as HTMLElement).dataset.columnId!
            return {
              id,
              columnId,
              top: r.top,
              height: r.height
            }
          })
        }

        setLocalCards(allCards)
        setDraggedCardId(card.id)
        setDraggedCardData(card)
        
        setDragOffset({
          x: x - rect.left,
          y: y - rect.top
        })
        setGlobalDragging(true)
        isDraggingCard.current = true
        pendingCardDrag.current = null
      }
    }

    if (pendingColumnDrag.current) {
      const { x, y, columnId, rect } = pendingColumnDrag.current
      const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))
      
      if (dist > 5) {
        setLocalColumns(serverColumns)
        setDraggedColumnId(columnId)
        
        if (scrollContainerRef.current) {
          const colElements = Array.from(scrollContainerRef.current.querySelectorAll('.board-column'))
          columnMidpoints.current = colElements
            .filter(col => (col as HTMLElement).dataset.columnId !== columnId)
            .map(col => {
              const r = col.getBoundingClientRect()
              return { mid: r.left + r.width / 2 }
            })
        }

        setDragOffset({
          x: x - rect.left,
          y: y - rect.top
        })
        setGlobalDragging(true)
        
        const index = serverColumns.findIndex(c => c.id === columnId)
        setPlaceholderIndex(index)
        pendingColumnDrag.current = null
      }
    }

    if (draggedColumnId) {
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0) rotate(2deg)`
      }
      
      const midpoints = columnMidpoints.current
      let newIndex = 0
      for (let i = 0; i < midpoints.length; i++) {
        if (e.clientX > midpoints[i].mid) {
          newIndex = i + 1
        } else {
          break
        }
      }
      
      if (newIndex !== placeholderIndex) {
          setPlaceholderIndex(newIndex)
          
          setLocalColumns(prev => {
            const filtered = prev.filter(c => c.id !== draggedColumnId)
            const draggedCol = prev.find(c => c.id === draggedColumnId)
            if (!draggedCol) return prev
            const updated = [...filtered]
            updated.splice(newIndex, 0, draggedCol)
            return updated
          })
        }
      return
    }

    if (draggedCardId) {
      if (cardGhostRef.current) {
        cardGhostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0)`
      }

      if (scrollContainerRef.current) {
        const colElements = Array.from(scrollContainerRef.current.querySelectorAll('.board-column'))
        const colRects = colElements.map((el, i) => {
          const r = el.getBoundingClientRect()
          return { id: displayColumns[i].id, left: r.left, right: r.right }
        })

        const hoveredCol = colRects.find(r => e.clientX >= r.left && e.clientX <= r.right)
        if (hoveredCol) {
          const targetColId = hoveredCol.id
          const cardElements = Array.from(scrollContainerRef.current.querySelectorAll(`.card-wrapper[data-column-id="${targetColId}"]:not(.is-placeholder)`))
          const rects = cardElements.map(el => {
            const r = el.getBoundingClientRect()
            return { id: (el as HTMLElement).dataset.cardId!, mid: r.top + r.height / 2 }
          })

          let insertIdxInCol = 0
          for (let i = 0; i < rects.length; i++) {
            if (e.clientY > rects[i].mid) {
              insertIdxInCol = i + 1
            } else {
              break
            }
          }

          setLocalCards(prev => {
            const updated = prev.filter(c => c.id !== draggedCardId)
            const card = prev.find(c => c.id === draggedCardId)
            if (!card) return prev
            
            const updatedCard = { ...card, columnId: targetColId }
            const cardsInTarget = updated.filter(c => c.columnId === targetColId)
            
            let finalGlobalIdx
            if (insertIdxInCol >= cardsInTarget.length) {
              const lastCardInTarget = cardsInTarget[cardsInTarget.length - 1]
              if (lastCardInTarget) {
                finalGlobalIdx = updated.indexOf(lastCardInTarget) + 1
              } else {
                const colIdx = displayColumns.findIndex(c => c.id === targetColId)
                let foundIdx = -1
                for (let i = colIdx + 1; i < displayColumns.length; i++) {
                  const firstInNext = updated.find(c => c.columnId === displayColumns[i].id)
                  if (firstInNext) {
                    foundIdx = updated.indexOf(firstInNext)
                    break
                  }
                }
                finalGlobalIdx = foundIdx !== -1 ? foundIdx : updated.length
              }
            } else {
              finalGlobalIdx = updated.indexOf(cardsInTarget[insertIdxInCol])
            }

            const currentIdx = prev.findIndex(c => c.id === draggedCardId)
            const cardsInPrevTarget = prev.filter(c => c.columnId === targetColId)
            const currentIdxInCol = cardsInPrevTarget.indexOf(prev[currentIdx])
            
            if (prev[currentIdx]?.columnId === targetColId && currentIdxInCol === insertIdxInCol) {
              return prev
            }

            updated.splice(finalGlobalIdx, 0, updatedCard)
            return updated
          })
        }
      }
      return
    }

    if (!isScrolling || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }, [draggedColumnId, draggedCardId, dragOffset, placeholderIndex, isScrolling, startX, scrollLeft, allCards, displayColumns, serverColumns])

  const handleMouseUpOrLeave = useCallback(() => {
    pendingCardDrag.current = null
    pendingColumnDrag.current = null

    if (draggedColumnId) {
      const finalIndex = placeholderIndex
      const finalColumns = [...localColumns]
      
      if (finalIndex !== null) {
        queryClient.setQueryData(['columns', boardId], finalColumns)
        
        const beforeCol = finalColumns[finalIndex - 1]
        const afterCol = finalColumns[finalIndex + 1]
        
        api.columns({ id: draggedColumnId }).move.patch({
          beforeColumnId: beforeCol?.id,
          afterColumnId: afterCol?.id
        }).then(({ error }) => {
          if (error) {
            queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
          }
        }).catch(() => {
          queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
        })
      }

      setDraggedColumnId(null)
      setPlaceholderIndex(null)
      setGlobalDragging(false)
      columnMidpoints.current = []
    }

    if (draggedCardId) {
      const finalCards = [...localCards]
      const cardIdx = finalCards.findIndex(c => c.id === draggedCardId)
      
      if (cardIdx !== -1) {
        queryClient.setQueryData(['cards', boardId], finalCards)

        const droppedCard = finalCards[cardIdx]
        const colId = droppedCard.columnId
        const colCards = finalCards.filter(c => c.columnId === colId)
        const inColIdx = colCards.indexOf(droppedCard)
        
        const beforeCard = colCards[inColIdx - 1]
        const afterCard = colCards[inColIdx + 1]

        api.tasks({ id: draggedCardId }).move.patch({
          columnId: colId,
          beforeTaskId: beforeCard?.id,
          afterTaskId: afterCard?.id
        }).then(({ error }) => {
          if (error) {
            queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
          }
        }).catch(() => {
          queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
        })
      }

      setDraggedCardId(null)
      setDraggedCardData(null)
      setGlobalDragging(false)
      isDraggingCard.current = false
    }

    pendingCardDrag.current = null
    setIsScrolling(false)
  }, [draggedColumnId, draggedCardId, placeholderIndex, localColumns, localCards, boardId, queryClient])

  const handleColumnDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const header = e.currentTarget as HTMLElement
    const columnId = header.closest('.board-column')?.getAttribute('data-column-id')
    if (!columnId) return

    const rect = header.getBoundingClientRect()
    
    pendingColumnDrag.current = {
      columnId,
      x: e.clientX,
      y: e.clientY,
      rect
    }
  }, [])

  const handleCardDragStart = useCallback((card: Card, e: React.MouseEvent) => {
    if (e.button !== 0) return
    
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    
    pendingCardDrag.current = {
      card,
      x: e.clientX,
      y: e.clientY,
      rect
    }
  }, [])

  const handleAddTask = useCallback(async (columnId: string, title: string) => {

    const { error } = await api.tasks.post({ title, columnId })
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  }, [boardId, queryClient])

  const handleRenameColumn = useCallback(async (columnId: string, newName: string) => {
    const { error } = await api.columns({ id: columnId }).patch({ name: newName })
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
    }
  }, [boardId, queryClient])

  const handleArchiveColumn = useCallback(async (columnId: string) => {
    const { error } = await api.columns({ id: columnId }).archive.post()
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  }, [boardId, queryClient])

  const handleCopyColumn = useCallback(async (columnId: string) => {
    const { error } = await api.columns({ id: columnId }).copy.post()
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  }, [boardId, queryClient])

  const handleMoveColumnToBoard = useCallback(async (columnId: string, targetBoardId: string) => {
    const { error } = await api.columns({ id: columnId })['move-to-board'].patch({ targetBoardId })
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  }, [boardId, queryClient])

  if (boardLoading || columnsLoading) return <div className="loading-state">Loading workspace...</div>
  if (!board) return <div className="loading-state">Error: Page not found</div>

  const draggedColumn = draggedColumnId ? displayColumns.find(c => c.id === draggedColumnId) : null

  return (
    <div className="board-container">
      <header className="board-header">
        <div className="header-left">
          <Link to="/dashboard" className="back-link">Workspace</Link>
          <ChevronRight size={14} style={{ color: 'var(--colors-text-muted)' }} />
          <h1 className="board-title">{board.name}</h1>
        </div>
        <div className="header-right">
        </div>
      </header>

      <div 
        className={`board-columns ${isScrolling ? 'is-dragging' : ''} ${draggedColumnId ? 'is-column-dragging' : ''} ${draggedCardId ? 'is-card-dragging' : ''}`}
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {displayColumns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            cards={cardsByColumn[column.id] || []}
            onCardClick={setSelectedCardId}
            onDragStart={handleColumnDragStart}
            onCardDragStart={handleCardDragStart}
            onAddTask={handleAddTask}
            onRenameColumn={handleRenameColumn}
            onArchiveColumn={handleArchiveColumn}
            onCopyColumn={handleCopyColumn}
            onMoveColumnToBoard={handleMoveColumnToBoard}
            boards={allBoards}
            isDragging={column.id === draggedColumnId}
            draggedCardId={draggedCardId}
          />
        ))}
        <div className="add-column-section">
          <input 
            className="board-input" 
            placeholder="+ Add a group" 
            value={newColumnName}
            onChange={e => setNewColumnName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newColumnName) {
                api.columns.post({ name: newColumnName, boardId }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
                  setNewColumnName('')
                })
              }
            }}
          />
        </div>
      </div>

      {draggedColumn && (
        <div 
          className="column-ghost"
          ref={ghostRef}
        >
          <h4 className="column-header">
            <span className="column-name-text">{draggedColumn.name}</span>
            <span className="column-count">{cardsByColumn[draggedColumn.id]?.length || 0}</span>
            <MoreHorizontal size={14} style={{ cursor: 'pointer', color: 'var(--colors-text-muted)' }} />
          </h4>
        </div>
      )}

      {draggedCardData && (
        <div className="card-ghost" ref={cardGhostRef}>
          <CardItem card={draggedCardData} onCardClick={() => {}} />
        </div>
      )}

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

const BoardColumn = memo(({ 
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
  isDragging,
  draggedCardId
}: { 
  column: Column
  cards: Card[]
  onCardClick: (id: string) => void
  onDragStart: (e: React.MouseEvent) => void
  onCardDragStart: (card: Card, e: React.MouseEvent) => void
  onAddTask: (columnId: string, title: string) => Promise<void>
  onRenameColumn: (columnId: string, newName: string) => Promise<void>
  onArchiveColumn: (columnId: string) => Promise<void>
  onCopyColumn: (columnId: string) => Promise<void>
  onMoveColumnToBoard: (columnId: string, targetBoardId: string) => Promise<void>
  boards: Board[]
  isDragging?: boolean
  draggedCardId: string | null
}) => {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(column.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (isAddingTask) {
      inputRef.current?.focus()
    }
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
    { label: 'Archive', icon: <Archive size={14} />, onClick: () => onArchiveColumn(column.id), variant: 'danger' as const },
  ]

  // Add Move options
  const otherBoards = boards.filter(b => b.id !== column.boardId)
  if (otherBoards.length > 0) {
    otherBoards.forEach(board => {
      menuItems.push({
        label: `Move to ${board.name}`,
        icon: <ExternalLink size={14} />,
        onClick: () => onMoveColumnToBoard(column.id, board.id)
      })
    })
  }

  return (
    <div 
      className={`board-column ${isDragging ? 'is-dragging' : ''}`}
      data-column-id={column.id}
    >
      <div className="column-header-container">
        <h4 
          className="column-header" 
          onMouseDown={onDragStart} 
          style={{ cursor: 'grab' }}
        >
          {isEditingName ? (
            <input
              ref={nameInputRef}
              className="column-name-input"
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
              className="column-name-text" 
              onClick={(e) => {
                e.stopPropagation()
                setIsEditingName(true)
              }}
            >
              {column.name}
            </span>
          )}
          <span className="column-count">{cards.length}</span>
          <div onMouseDown={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
            <Dropdown 
              trigger={<MoreHorizontal size={14} style={{ cursor: 'pointer', color: 'var(--colors-text-muted)' }} />}
              items={menuItems}
            />
          </div>
        </h4>
      </div>
      <div className="cards-list">
        {cards.map((card) => (
            <CardItem 
              key={card.id} 
              card={card} 
              onCardClick={onCardClick} 
              onCardDragStart={onCardDragStart}
              isDragging={card.id === draggedCardId}
            />
        ))}
        {cards.length === 0 && (
          <div className="empty-column-placeholder">No items</div>
        )}
      </div>
      <div className="add-card-container">
        {isAddingTask ? (
          <input
            ref={inputRef}
            className="board-input"
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
          <button className="btn-add-card" onClick={() => setIsAddingTask(true)}>
            <Plus size={14} /> New
          </button>
        )}
      </div>
    </div>
  )
})

const CardItem = memo(({ 
  card, 
  onCardClick, 
  onCardDragStart,
  isDragging 
}: { 
  card: Card
  onCardClick: (id: string) => void
  onCardDragStart?: (card: Card, e: React.MouseEvent) => void
  isDragging?: boolean
}) => {
  const now = new Date()
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const isOverdue = card.dueDate && new Date(card.dueDate) < now
  const isDueSoon = card.dueDate && !isOverdue && new Date(card.dueDate) <= twoDaysFromNow

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onCardDragStart?.(card, e)
  }, [card, onCardDragStart])

  const handleClick = useCallback(() => {
    onCardClick(card.id)
  }, [card, onCardClick])

  return (
    <div 
      className={`card-wrapper ${isDragging ? 'is-placeholder' : ''}`}
      onMouseDown={handleMouseDown}
      data-card-id={card.id}
      data-column-id={card.columnId}
    >
      <div className="card-item" onClick={handleClick}>
        {card.labels && card.labels.length > 0 && (
          <div className="card-labels">
            {card.labels.map(l => (
              <div key={l.id} className="card-label-pill" style={{ background: l.color }} />
            ))}
          </div>
        )}
        <div className="card-item-title">{card.title}</div>
        {(card.checklistProgress || card.dueDate) && (
          <div className="card-meta">
            {card.checklistProgress && (
              <span className="checklist-meta">
                <CheckSquare size={12} />
                {card.checklistProgress.completed}/{card.checklistProgress.total}
              </span>
            )}
            {card.dueDate && (
              <span className={`due-date-meta ${isOverdue ? 'overdue' : ''} ${isDueSoon ? 'soon' : ''}`}>
                {new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
