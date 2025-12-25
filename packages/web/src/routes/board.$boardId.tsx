import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState } from 'react'
import { useBoardSocket } from '../hooks/useBoardSocket'
import './board.$boardId.css'

export const Route = createFileRoute('/board/$boardId')({
  component: BoardComponent,
})

function BoardComponent() {
  const { boardId } = Route.useParams()
  const queryClient = useQueryClient()
  const [newColumnName, setNewColumnName] = useState('')

  useBoardSocket(boardId)

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const { data, error } = await api.boards({ id: boardId }).get()
      if (error) throw error
      return data
    },
  })

  const { data: columns, isLoading: columnsLoading } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: async () => {
      const { data, error } = await api.columns.board({ boardId }).get()
      if (error) throw error
      return data
    },
  })

  const createColumn = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.columns.post({
        name,
        boardId,
        order: (columns?.length || 0) + 1
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      setNewColumnName('')
    }
  })

  if (boardLoading || columnsLoading) return <div className="loading-state">// Loading board_core...</div>
  if (!board) return <div className="loading-state">// Error: Board not found</div>

  return (
    <div className="board-container">
      <header className="board-header">
        <div className="header-title-container">
          <Link to="/dashboard" className="back-link">← Dashboard</Link>
          <h1 className="board-title">
            <span className="board-title-prefix">//</span> {board.name}
          </h1>
        </div>
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
      </header>

      <div className="board-columns">
        {columns?.map((column) => (
          <ColumnItem key={column.id} column={column} />
        ))}
      </div>
    </div>
  )
}

function ColumnItem({ column }: { column: { id: string; name: string } }) {
  const queryClient = useQueryClient()
  const [newCardTitle, setNewCardTitle] = useState('')

  const { data: cards, isLoading: cardsLoading } = useQuery({
    queryKey: ['cards', column.id],
    queryFn: async () => {
      const { data, error } = await api.cards.column({ columnId: column.id }).get()
      if (error) throw error
      return data
    },
  })

  const createCard = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await api.cards.post({
        title,
        columnId: column.id,
        order: (cards?.length || 0) + 1,
        description: ''
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', column.id] })
      setNewCardTitle('')
    }
  })

  return (
    <div className="board-column">
      <h4 className="column-header">
        <span className="column-header-prefix">&gt;</span> {column.name}
      </h4>
      <div className="cards-list">
        {cardsLoading ? (
          <div className="loading-state" style={{ fontSize: '11px', padding: '8px 0' }}>// Loading cards...</div>
        ) : (
          cards?.map((card) => (
            <div key={card.id} className="card-item">
              <span className="card-prefix">//</span> {card.title}
            </div>
          ))
        )}
        <div className="add-card-container">
          <input
            type="text"
            placeholder="Card title..."
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            className="card-input"
            onKeyDown={(e) => e.key === 'Enter' && newCardTitle && createCard.mutate(newCardTitle)}
          />
          <button 
            onClick={() => newCardTitle && createCard.mutate(newCardTitle)}
            className="btn-add-card"
          >
            {createCard.isPending ? 'Adding...' : '+ Add Card'}
          </button>
        </div>
      </div>
    </div>
  )
}
