import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useMemo, useRef } from 'react'
import { Plus, MoreHorizontal, ChevronRight } from 'lucide-react'
import { useBoardSocket } from '../hooks/useBoardSocket'
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
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    
    // Only drag if clicking on the blank space (the container itself)
    // or if the target is not a button, link, or card
    const target = e.target as HTMLElement
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('.card-item') || 
      target.closest('input') ||
      target.closest('textarea')
    ) return

    setIsDragging(true)
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // multiplier for scroll speed
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

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

  const cardsByColumn = useMemo(() => {
    const map: Record<string, Card[]> = {}
    columns.forEach(col => {
      map[col.id] = allCards.filter(c => c.columnId === col.id)
    })
    return map
  }, [columns, allCards])

  if (boardLoading || columnsLoading) return <div className="loading-state">Loading workspace...</div>
  if (!board) return <div className="loading-state">Error: Page not found</div>

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
        className={`board-columns ${isDragging ? 'is-dragging' : ''}`}
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            cards={cardsByColumn[column.id] || []}
            onCardClick={setSelectedCardId}
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
  cards, 
  onCardClick
}: { 
  column: Column
  cards: Card[]
  onCardClick: (id: string) => void
}) {
  return (
    <div className="board-column">
      <h4 className="column-header">
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
}

function CardItem({ card, onClick }: { card: Card, onClick: () => void }) {
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
}
