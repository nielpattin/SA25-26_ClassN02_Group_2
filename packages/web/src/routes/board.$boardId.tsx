import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState } from 'react'
import { useBoardSocket } from '../hooks/useBoardSocket'

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

  if (boardLoading || columnsLoading) return <div>Loading board...</div>
  if (!board) return <div>Board not found</div>

  return (
    <div className="board-view" style={{ padding: '2rem', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>{board.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            placeholder="New Column"
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <button 
            onClick={() => newColumnName && createColumn.mutate(newColumnName)}
            style={{ padding: '0.5rem 1rem', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add Column
          </button>
        </div>
      </header>

      <div className="columns-container" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', flex: 1, paddingBottom: '1rem' }}>
        {columns?.map((column) => (
          <ColumnItem key={column.id} column={column} boardId={boardId} />
        ))}
      </div>
    </div>
  )
}

function ColumnItem({ column, boardId }: { column: any, boardId: string }) {
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
    <div
      className="column"
      style={{
        width: '300px',
        minWidth: '300px',
        background: '#f4f5f7',
        borderRadius: '8px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}
    >
      <h4 style={{ margin: 0 }}>{column.name}</h4>
      <div className="cards-list" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {cardsLoading ? (
          <div style={{ fontSize: '0.8rem', color: '#888' }}>Loading cards...</div>
        ) : (
          cards?.map((card) => (
            <div
              key={card.id}
              style={{
                background: 'white',
                padding: '0.8rem',
                borderRadius: '4px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                fontSize: '0.9rem'
              }}
            >
              {card.title}
            </div>
          ))
        )}
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Card title..."
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '0.85rem' }}
          />
          <button 
            onClick={() => newCardTitle && createCard.mutate(newCardTitle)}
            style={{ padding: '0.4rem', background: '#e2e4e6', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            + Add Card
          </button>
        </div>
      </div>
    </div>
  )
}
