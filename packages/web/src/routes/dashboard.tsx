import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState } from 'react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardComponent,
})

function DashboardComponent() {
  const queryClient = useQueryClient()
  const [newBoardName, setNewBoardName] = useState('')

  const { data: boards, isLoading } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await api.boards.get()
      if (error) throw error
      return data
    },
  })

  const createBoard = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await api.boards.post({ name })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      setNewBoardName('')
    },
  })

  const deleteBoard = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.boards({ id }).delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
    },
  })

  return (
    <div className="dashboard-container" style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>My Boards</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            placeholder="New Board Name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button
            onClick={() => newBoardName && createBoard.mutate(newBoardName)}
            disabled={createBoard.isPending}
            style={{ padding: '0.5rem 1rem', borderRadius: '4px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            {createBoard.isPending ? 'Creating...' : 'Create Board'}
          </button>
        </div>
      </header>

      {isLoading ? (
        <p>Loading boards...</p>
      ) : (
        <div className="boards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {boards?.map((board) => (
            <div
              key={board.id}
              className="board-card"
              style={{
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #eee',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <h3 style={{ margin: 0 }}>{board.name}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Link
                  to="/board/$boardId"
                  params={{ boardId: board.id.toString() }}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    background: '#f8f9fa',
                    textDecoration: 'none',
                    color: '#333',
                    border: '1px solid #ddd'
                  }}
                >
                  Open Board
                </Link>
                <button
                  onClick={() => deleteBoard.mutate(board.id)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '4px',
                    background: '#ffefef',
                    color: '#dc3545',
                    border: '1px solid #f5c6cb',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {boards?.length === 0 && <p>No boards found. Create your first one!</p>}
        </div>
      )}
    </div>
  )
}
