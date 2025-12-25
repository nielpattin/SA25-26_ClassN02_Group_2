import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState } from 'react'
import './dashboard.css'

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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="title-group">
          <Link to="/" className="home-link">← Home</Link>
          <h1 className="dashboard-title">
            <span className="title-prefix">//</span> MY BOARDS
          </h1>
        </div>
        <div className="input-group">
          <input
            type="text"
            placeholder="New board name..."
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            className="dashboard-input"
            onKeyDown={(e) => e.key === 'Enter' && newBoardName && createBoard.mutate(newBoardName)}
          />
          <button
            onClick={() => newBoardName && createBoard.mutate(newBoardName)}
            disabled={createBoard.isPending}
            className="btn-kyte-primary"
          >
            {createBoard.isPending ? 'Creating...' : '+ Create'}
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="loading-state">// Loading board_registry...</div>
      ) : (
        <div className="dashboard-grid">
          {boards?.map((board) => (
            <div key={board.id} className="board-card">
              <h3>
                <span className="card-title-prefix">&gt;</span> {board.name}
              </h3>
              <div className="card-actions">
                <Link
                  to="/board/$boardId"
                  params={{ boardId: board.id.toString() }}
                  className="btn-kyte-secondary"
                >
                  Open
                </Link>
                <button
                  onClick={() => deleteBoard.mutate(board.id)}
                  className="btn-kyte-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {boards?.length === 0 && (
            <div className="empty-state">
              <span className="empty-prefix">//</span> No boards detected in current session.
              <br />
              <span className="empty-hint">&gt; Use the input above to initialize a new board.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
