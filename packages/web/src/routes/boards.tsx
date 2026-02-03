import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useSession } from '../api/auth'
import { useState, useEffect } from 'react'
import { Plus, Trash2, ShoppingBag } from 'lucide-react'
import { AuthModal } from '../components/auth/AuthModal'
import { AvatarPickerModal } from '../components/ui/AvatarPickerModal'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { useWorkspace } from '../context/WorkspaceContext'
import { SearchTrigger } from '../components/search'

export const Route = createFileRoute('/boards')({
  component: DashboardComponent,
  validateSearch: (search: Record<string, unknown>): { setup?: boolean } => {
    return {
      setup: search.setup === 'true' || search.setup === true || undefined,
    }
  },
})

function DashboardComponent() {
  const { setup } = Route.useSearch()
  const navigate = useNavigate()
  const { data: session, isPending: isSessionLoading } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(!!setup)

  useEffect(() => {
    if (setup && session) {
      // Clear search param immediately to prevent showing again on refresh
      navigate({ to: '/boards', search: { setup: undefined }, replace: true })
    }
  }, [setup, session, navigate])

  // Derive modal state from session - show if not loading and no session
  const shouldShowModal = showAuthModal || (!isSessionLoading && !session)

  if (isSessionLoading) {
    return (
      <div className="bg-canvas min-h-screen p-12">
        <div className="font-heading font-extrabold text-black uppercase">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <AuthModal
        isOpen={shouldShowModal}
        onClose={() => setShowAuthModal(false)}
      />
      <AvatarPickerModal
        isOpen={showSetupModal}
        onClose={() => {
          setShowSetupModal(false)
          // Clear search param
          navigate({ to: '/boards', search: { setup: undefined }, replace: true })
        }}
        userName={session?.user.name || ''}
        githubAvatarUrl={session?.user.image}
      />
      {session ? (
        <DashboardLayout>
          <BoardsDashboard />
        </DashboardLayout>
      ) : (
        <div className="bg-canvas min-h-screen p-12">
          <header className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-2">
                <Link to="/" className="text-sm font-extrabold text-black uppercase hover:underline">← Home</Link>
                <h1 className="font-heading m-0 text-[32px] font-bold tracking-tight text-black uppercase">Workspace</h1>
              </div>
            </div>
          </header>
          <div className="flex flex-col items-center justify-center gap-6 border border-dashed border-black bg-black/5 p-20">
            <p className="m-0 text-lg font-bold text-black uppercase">Please log in to view your boards</p>
            <button 
              onClick={() => setShowAuthModal(true)} 
              className="hover:bg-accent hover:shadow-brutal-md rounded-none border border-black bg-black px-6 py-3 font-extrabold tracking-wider text-white uppercase transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-black"
            >
              Login / Sign Up
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function BoardsDashboard() {
  const queryClient = useQueryClient()
  const [newBoardName, setNewBoardName] = useState('')
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace()

  const { data: boards, isLoading: isBoardsLoading } = useQuery({
    queryKey: ['boards', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return []
      
      // Use the workspace-specific endpoint
      const { data, error } = await api.v1.workspaces({ id: currentWorkspace.id }).boards.get()
      
      if (error) throw error
      return data
    },
    enabled: !!currentWorkspace?.id,
  })

  const createBoard = useMutation({
    mutationFn: async (name: string) => {
      if (!currentWorkspace) throw new Error('No workspace selected')
      
      const { data, error } = await api.v1.boards.post({ 
        name,
        workspaceId: currentWorkspace.id
      })
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
      const { data, error } = await api.v1.boards({ id }).delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
    },
  })

  if (isWorkspaceLoading || (isBoardsLoading && currentWorkspace)) {
     return <div className="font-heading p-12 font-extrabold text-black uppercase">Loading workspace...</div>
  }

  return (
    <div className="p-12 lg:px-16">
      <header className="mb-10 flex items-center justify-between">
        <div>
          <h1 className="font-heading m-0 text-[32px] font-bold tracking-tight text-black uppercase">
            {currentWorkspace?.personal ? 'My Boards' : `${currentWorkspace?.name} Boards`}
          </h1>
          <p className="mt-2 text-sm font-medium text-gray-500 uppercase">
            {currentWorkspace?.personal ? 'Personal Workspace' : 'Team Workspace'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/templates/marketplace"
            search={{ q: '', category: '', sort: 'newest', page: 1 }}
            className="hover:bg-accent hover:shadow-brutal-md flex items-center gap-2 rounded-none border border-black bg-white px-4 py-2 text-sm font-extrabold text-black uppercase transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
          >
            <ShoppingBag size={16} />
            Templates
          </Link>
          <SearchTrigger />
        </div>
      </header>

      <div className="mb-12 flex max-w-150 gap-4">
        <input
          type="text"
          placeholder="Add a new board..."
          value={newBoardName}
          onChange={(e) => setNewBoardName(e.target.value)}
          className="font-heading shadow-brutal-md focus:bg-accent flex-1 rounded-none border border-black bg-white px-4 py-3 text-sm font-extrabold tracking-wider text-black uppercase transition-all outline-none focus:-translate-x-0.5 focus:-translate-y-0.5"
          onKeyDown={(e) => e.key === 'Enter' && newBoardName && createBoard.mutate(newBoardName)}
        />
        <button
          onClick={() => newBoardName && createBoard.mutate(newBoardName)}
          disabled={createBoard.isPending}
          className="hover:bg-accent hover:shadow-brutal-md flex cursor-pointer items-center justify-center rounded-none border border-black bg-black px-6 text-white transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-black disabled:opacity-50"
        >
          {createBoard.isPending ? 'Adding...' : <Plus size={16} />}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.isArray(boards) && boards.map((board) => (
          <Link
            key={board.id}
            to="/board/$boardId"
            params={{ boardId: board.id.toString() }}
            className="group bg-surface shadow-brutal-md hover:bg-accent hover:shadow-brutal-xl flex min-h-40 flex-col justify-between border border-black p-8 transition-all hover:-translate-x-1 hover:-translate-y-1"
          >
            <h3 className="font-heading m-0 text-lg font-extrabold text-black uppercase">{board.name}</h3>
            <div className="flex justify-end opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  deleteBoard.mutate(board.id)
                }}
                className="border border-black bg-white p-2 text-black transition-colors hover:bg-red-500 hover:text-white"
                title="Delete Page"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </Link>
        ))}
        {(!boards || (Array.isArray(boards) && boards.length === 0)) && (
          <div className="text-text-subtle col-span-full border border-dashed border-black bg-black/5 p-12 text-center font-bold uppercase">
            No boards found in this workspace. Start by adding one above.
          </div>
        )}
      </div>
    </div>
  )
}
