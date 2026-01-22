import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect, useMemo } from 'react'
import { Search, FileText, LayoutGrid, ArrowLeft } from 'lucide-react'
import { useSession } from '../api/auth'
import { AuthModal } from '../components/auth/AuthModal'
import { DashboardLayout } from '../components/layout/DashboardLayout'
import { useSearch } from '../hooks/useSearch'
import type { BoardSearchResult, TaskSearchResult } from '../hooks/useSearch'

export const Route = createFileRoute('/search')({
  component: SearchPage,
})

function SearchPage() {
  const { data: session, isPending: isSessionLoading } = useSession()
  const [showAuthModal, setShowAuthModal] = useState(false)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

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
      {session ? (
        <DashboardLayout>
          <SearchContent 
            query={query} 
            debouncedQuery={debouncedQuery}
            onQueryChange={setQuery} 
          />
        </DashboardLayout>
      ) : (
        <div className="bg-canvas min-h-screen p-12">
          <p className="font-bold text-black uppercase">Please log in to search</p>
          <button 
            onClick={() => setShowAuthModal(true)} 
            className="hover:bg-accent hover:shadow-brutal-md mt-4 rounded-none border border-black bg-black px-6 py-3 font-extrabold tracking-wider text-white uppercase transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-black"
          >
            Login / Sign Up
          </button>
        </div>
      )}
    </>
  )
}

interface SearchContentProps {
  query: string
  debouncedQuery: string
  onQueryChange: (query: string) => void
}

function SearchContent({ query, debouncedQuery, onQueryChange }: SearchContentProps) {
  const { data, isLoading, isError } = useSearch(debouncedQuery)

  const { boards, tasks } = useMemo(() => {
    if (!data?.data) return { boards: [], tasks: [] }
    
    return {
      boards: data.data.filter((r): r is BoardSearchResult => r.type === 'board'),
      tasks: data.data.filter((r): r is TaskSearchResult => r.type === 'task'),
    }
  }, [data])

  return (
    <div className="p-12 lg:px-16">
      <header className="mb-10">
        <Link 
          to="/boards" 
          className="mb-4 inline-flex items-center gap-2 text-sm font-extrabold text-black uppercase hover:underline"
        >
          <ArrowLeft size={14} />
          Back to Boards
        </Link>
        <h1 className="font-heading m-0 text-[32px] font-bold tracking-tight text-black uppercase">
          Search
        </h1>
      </header>

      {/* Search Input */}
      <div className="mb-12 max-w-2xl">
        <div className="relative">
          <Search 
            size={20} 
            className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" 
          />
          <input
            type="text"
            placeholder="Search boards and tasks..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="font-heading shadow-brutal-md focus:bg-accent w-full rounded-none border border-black bg-white py-4 pr-4 pl-12 text-sm font-extrabold tracking-wider text-black uppercase transition-all outline-none focus:-translate-x-0.5 focus:-translate-y-0.5"
            autoFocus
          />
        </div>
        {debouncedQuery.length > 0 && debouncedQuery.length < 2 && (
          <p className="mt-2 text-sm text-gray-500">Enter at least 2 characters to search</p>
        )}
      </div>

      {/* Results */}
      {isLoading && debouncedQuery.length >= 2 && (
        <div className="font-heading font-extrabold text-black uppercase">Searching...</div>
      )}

      {isError && (
        <div className="border border-red-500 bg-red-50 p-4 text-red-700">
          An error occurred while searching. Please try again.
        </div>
      )}

      {data && debouncedQuery.length >= 2 && (
        <div className="space-y-10">
          {/* Summary */}
          <p className="text-sm font-medium text-gray-500 uppercase">
            Found {data.pagination.total} result{data.pagination.total !== 1 ? 's' : ''} for "{debouncedQuery}"
          </p>

          {/* Boards Section */}
          {boards.length > 0 && (
            <section>
              <h2 className="font-heading mb-4 flex items-center gap-2 text-lg font-bold text-black uppercase">
                <LayoutGrid size={18} />
                Boards ({boards.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {boards.map((board) => (
                  <Link
                    key={board.id}
                    to="/board/$boardId"
                    params={{ boardId: board.id }}
                    className="bg-surface shadow-brutal-md hover:bg-accent hover:shadow-brutal-xl border border-black p-6 transition-all hover:-translate-x-1 hover:-translate-y-1"
                  >
                    <h3 className="font-heading m-0 text-base font-extrabold text-black uppercase">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                        {board.description}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Tasks Section */}
          {tasks.length > 0 && (
            <section>
              <h2 className="font-heading mb-4 flex items-center gap-2 text-lg font-bold text-black uppercase">
                <FileText size={18} />
                Tasks ({tasks.length})
              </h2>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <Link
                    key={task.id}
                    to="/board/$boardId"
                    params={{ boardId: task.boardId }}
                    className="bg-surface shadow-brutal-md hover:bg-accent hover:shadow-brutal-xl block border border-black p-4 transition-all hover:-translate-x-1 hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-heading m-0 text-sm font-extrabold text-black uppercase">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="mt-1 line-clamp-1 text-sm text-gray-600">
                            {task.description}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-bold text-gray-500 uppercase">
                        in {task.boardName}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* No Results */}
          {data.data.length === 0 && (
            <div className="border border-dashed border-black bg-black/5 p-12 text-center">
              <p className="font-bold text-black uppercase">No results found for "{debouncedQuery}"</p>
              <p className="mt-2 text-sm text-gray-500">Try different keywords or check the spelling</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
