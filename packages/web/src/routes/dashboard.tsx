import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useSession, signOut } from '../api/auth'
import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { AuthModal } from '../components/auth/AuthModal'

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
      <div className="min-h-screen bg-canvas p-12">
        <div className="text-black font-heading font-extrabold uppercase">Loading...</div>
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
        <div className="min-h-screen bg-canvas p-12">
          <header className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-2">
                <Link to="/" className="text-black text-sm font-extrabold uppercase hover:underline">← Home</Link>
                <h1 className="m-0 font-heading text-[32px] font-bold tracking-tight text-black uppercase">Workspace</h1>
              </div>
            </div>
          </header>
          <div className="flex flex-col items-center justify-center p-20 border-2 border-dashed border-black bg-black/5 gap-6">
            <p className="m-0 text-lg font-bold text-black uppercase">Please log in to view your boards</p>
            <button 
              onClick={() => setShowAuthModal(true)} 
              className="px-6 py-3 rounded-none border-2 border-black bg-black text-white font-extrabold uppercase tracking-wider hover:bg-accent hover:text-black hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
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
    <div className="min-h-screen bg-canvas p-12 lg:px-16">
      <header className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <Link to="/" className="text-black text-sm font-extrabold uppercase hover:underline">← Home</Link>
            <h1 className="m-0 font-heading text-[32px] font-bold tracking-tight text-black uppercase">Workspace</h1>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-black font-extrabold uppercase text-sm tracking-wider">{user.name}</span>
          <button 
            onClick={handleSignOut} 
            className="px-4 py-2 bg-white border-2 border-black text-black font-extrabold uppercase text-[11px] rounded-none hover:bg-gray-200 hover:shadow-brutal-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex gap-4 mb-12 max-w-150">
        <input
          type="text"
          placeholder="Add a new page..."
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          className="flex-1 bg-white border-2 border-black px-4 py-3 font-heading text-sm font-extrabold text-black outline-none rounded-none shadow-brutal-md uppercase tracking-wider focus:bg-accent focus:-translate-x-0.5 focus:-translate-y-0.5 transition-all"
          onKeyDown={(e) => e.key === 'Enter' && newBoardName && createBoard.mutate(newBoardName)}
        />
        <button
          onClick={() => newBoardName && createBoard.mutate(newBoardName)}
          disabled={createBoard.isPending}
          className="px-6 bg-black border-2 border-black text-white rounded-none cursor-pointer flex items-center justify-center hover:bg-accent hover:text-black hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all disabled:opacity-50"
        >
          {createBoard.isPending ? 'Adding...' : <Plus size={16} />}
        </button>
      </div>

      {isLoading ? (
        <div className="text-black font-heading font-extrabold uppercase">Loading workspace...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {Array.isArray(boards) && boards.map((board) => (
            <Link
              key={board.id}
              to="/board/$boardId"
              params={{ boardId: board.id.toString() }}
              className="group bg-surface border-2 border-black p-8 flex flex-col justify-between min-h-40 shadow-brutal-md hover:bg-accent hover:-translate-x-1 hover:-translate-y-1 hover:shadow-brutal-xl transition-all"
            >
              <h3 className="m-0 font-heading text-lg font-extrabold text-black uppercase">{board.name}</h3>
              <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteBoard.mutate(board.id)
                  }}
                  className="p-2 bg-white border-2 border-black text-black hover:bg-red-500 hover:text-white transition-colors"
                  title="Delete Page"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Link>
          ))}
          {(!boards || (Array.isArray(boards) && boards.length === 0)) && (
            <div className="col-span-full p-12 border-2 border-dashed border-black bg-black/5 text-center text-text-subtle font-bold uppercase">
              No pages yet. Start by adding one above.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
