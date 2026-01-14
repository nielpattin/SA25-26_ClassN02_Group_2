import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useRef, useLayoutEffect, useMemo, useCallback, memo } from 'react'
import { Plus, MoreHorizontal, ChevronRight } from 'lucide-react'
import { useBoardSocket, setDragging as setGlobalDragging } from '../hooks/useBoardSocket'
import { CardModal } from '../components/CardModal'
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
  
  // Drag to scroll logic
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  // Column Drag and Drop logic
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const columnRects = useRef<{ id: string, left: number, width: number }[]>([])
  const lastMousePos = useRef({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [localColumns, setLocalColumns] = useState<Column[]>([])
  const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (draggedColumnId && ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${lastMousePos.current.x - dragOffset.x}px, ${lastMousePos.current.y - dragOffset.y}px, 0) rotate(2deg)`
    }
  }, [draggedColumnId, dragOffset])

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
    if (draggedColumnId) {
      lastMousePos.current = { x: e.clientX, y: e.clientY }
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0) rotate(2deg)`
      }
      
      // Find new placeholder index using cached rects
      let newIndex = columnRects.current.length
      for (let i = 0; i < columnRects.current.length; i++) {
        const rect = columnRects.current[i]
        const colMid = rect.left + rect.width / 2
        if (e.clientX < colMid) {
          newIndex = i
          break
        }
      }
      
      if (newIndex !== placeholderIndex) {
        setPlaceholderIndex(newIndex)
        
        // Reorder localColumns
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

    if (!isScrolling || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // multiplier for scroll speed
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }, [draggedColumnId, dragOffset, isScrolling, placeholderIndex, startX, scrollLeft])

  const handleMouseUpOrLeave = useCallback(() => {
    if (draggedColumnId) {
      const finalIndex = placeholderIndex
      const finalColumns = [...localColumns]
      
      if (finalIndex !== null) {
        // Optimistically update the cache
        queryClient.setQueryData(['columns', boardId], finalColumns)
        
        // Find neighbors for positioning in the new state
        const beforeCol = finalColumns[finalIndex - 1]
        const afterCol = finalColumns[finalIndex + 1]
        
        api.columns({ id: draggedColumnId }).move.patch({
          beforeColumnId: beforeCol?.id,
          afterColumnId: afterCol?.id
        }).then(({ error }) => {
          if (error) {
            // Revert on error
            queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
          }
        }).catch(() => {
          queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
        })
      }

      setDraggedColumnId(null)
      setPlaceholderIndex(null)
      setGlobalDragging(false)
    }
    setIsScrolling(false)
  }, [draggedColumnId, placeholderIndex, localColumns, boardId, queryClient])

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
      return (data || []).sort((a, b) => a.position.localeCompare(b.position))
    },
  })

  const handleColumnDragStart = useCallback((columnId: string, e: React.MouseEvent) => {
    const header = e.currentTarget as HTMLElement
    const rect = header.getBoundingClientRect()
    
    // Cache column rects for performance
    if (scrollContainerRef.current) {
      const cols = Array.from(scrollContainerRef.current.querySelectorAll('.board-column'))
      columnRects.current = cols.map((col, i) => {
        const r = col.getBoundingClientRect()
        return {
          id: serverColumns[i].id,
          left: r.left,
          width: r.width
        }
      })
    }

    setLocalColumns(serverColumns)
    setDraggedColumnId(columnId)
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setGlobalDragging(true)
    
    const index = serverColumns.findIndex(c => c.id === columnId)
    setPlaceholderIndex(index)
  }, [serverColumns])

  const displayColumns = draggedColumnId ? localColumns : serverColumns

  const { data: allCards = [] } = useQuery({
    queryKey: ['cards', boardId],
    queryFn: async () => {
      const { data, error } = await api.tasks.board({ boardId }).enriched.get()
      if (error) throw error
      return (data || []).sort((a, b) => a.position.localeCompare(b.position)) as Card[]
    },
  })

  const cardsByColumn = useMemo(() => {
    const map: Record<string, Card[]> = {}
    displayColumns.forEach(col => {
      map[col.id] = []
    })
    allCards.forEach(card => {
      if (map[card.columnId]) {
        map[card.columnId].push(card)
      }
    })
    return map
  }, [displayColumns, allCards])

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
        className={`board-columns ${isScrolling ? 'is-dragging' : ''} ${draggedColumnId ? 'is-column-dragging' : ''}`}
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
            onDragStart={(e) => handleColumnDragStart(column.id, e)}
            isDragging={column.id === draggedColumnId}
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
            {draggedColumn.name}
            <span className="column-count">{cardsByColumn[draggedColumn.id]?.length || 0}</span>
            <MoreHorizontal size={14} style={{ cursor: 'pointer', color: 'var(--colors-text-muted)' }} />
          </h4>
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
  isDragging
}: { 
  column: Column
  cards: Card[]
  onCardClick: (id: string) => void
  onDragStart: (e: React.MouseEvent) => void
  isDragging?: boolean
}) => {
  return (
    <div className={`board-column ${isDragging ? 'is-dragging' : ''}`}>
      <h4 className="column-header" onMouseDown={onDragStart} style={{ cursor: 'grab' }}>
        {column.name}
        <span className="column-count">{cards.length}</span>
        <MoreHorizontal size={14} style={{ cursor: 'pointer', color: 'var(--colors-text-muted)' }} />
      </h4>
      <div className="cards-list">
        {cards.map((card) => (
          <CardItem 
            key={card.id} 
            card={card} 
            onClick={() => onCardClick(card.id)} 
          />
        ))}
        {cards.length === 0 && (
          <div className="empty-column-placeholder">No items</div>
        )}
      </div>
      <div className="add-card-container">
        <button className="btn-add-card"><Plus size={14} /> New</button>
      </div>
    </div>
  )
})

const CardItem = memo(({ card, onClick }: { card: Card, onClick: () => void }) => {
  return (
    <div className="card-wrapper">
      <div className="card-item" onClick={onClick}>
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
              <span>✓ {card.checklistProgress.completed}/{card.checklistProgress.total}</span>
            )}
            {card.dueDate && (
              <span>{new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
