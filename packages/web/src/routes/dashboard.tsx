import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState } from 'react'
import { ThemeToggle } from '../components/ThemeToggle'
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
        <div className="header-left">
          <div className="title-group">
            <Link to="/" className="home-link">← Home</Link>
            <h1 className="dashboard-title">MY BOARDS</h1>
          </div>
        </div>
        <div className="header-right">
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
          <ThemeToggle />
        </div>
      </header>

      {isLoading ? (
        <div className="loading-state">Loading boards...</div>
      ) : (
        <div className="dashboard-grid">
          {boards?.map((board) => (
            <div key={board.id} className="board-card">
              <h3>{board.name}</h3>
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
              No boards found.
              <br />
              <span className="empty-hint">Use the input above to create a new board.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
