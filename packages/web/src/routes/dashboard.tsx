import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useSession, signOut } from '../api/auth'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { AuthModal } from '../components/auth/AuthModal'
import './dashboard.css'

export const Route = createFileRoute('/dashboard')({
  component: DashboardComponent,
})

function DashboardComponent() {
  const { data: session, isPending: isSessionLoading } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Derive modal state from session - show if not loading and no session
  const shouldShowModal = showAuthModal || (!isSessionLoading && !session)

  if (isSessionLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <AuthModal
        isOpen={shouldShowModal}
        onClose={() => setShowAuthModal(false)}
      />
      {session ? (
        <BoardsDashboard user={session.user} />
      ) : (
        <div className="dashboard-container">
          <header className="dashboard-header">
            <div className="header-left">
              <div className="title-group">
                <Link to="/" className="back-link">← Home</Link>
                <h1 className="dashboard-title">Workspace</h1>
              </div>
            </div>
          </header>
          <div className="empty-state">
            <p>Please log in to view your boards</p>
            <button onClick={() => setShowAuthModal(true)} className="btn-kyte-primary">
              Login / Sign Up
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function BoardsDashboard({ user }: { user: { id: string; name: string; email: string } }) {
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

  const handleSignOut = async () => {
    await signOut()
    queryClient.clear()
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="title-group">
            <Link to="/" className="back-link">← Home</Link>
            <h1 className="dashboard-title">Workspace</h1>
          </div>
        </div>
        <div className="header-right">
          <span className="user-name">{user.name}</span>
          <button onClick={handleSignOut} className="btn-kyte-secondary">
            Logout
          </button>
        </div>
      </header>

      <div className="input-group">
        <input
          type="text"
          placeholder="Add a new page..."
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
          {createBoard.isPending ? 'Adding...' : <Plus size={16} />}
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading workspace...</div>
      ) : (
        <div className="dashboard-grid">
          {Array.isArray(boards) && boards.map((board) => (
            <Link
              key={board.id}
              to="/board/$boardId"
              params={{ boardId: board.id.toString() }}
              className="board-card"
            >
              <h3>{board.name}</h3>
              <div className="card-actions">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteBoard.mutate(board.id)
                  }}
                  className="btn-kyte-danger"
                  title="Delete Page"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Link>
          ))}
          {(!boards || (Array.isArray(boards) && boards.length === 0)) && (
            <div className="empty-text">
              No pages yet. Start by adding one above.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
