import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, FileText, LayoutGrid, Clock, X } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useSearchModal } from '../../context/SearchContext'
import { useSearch, type BoardSearchResult, type TaskSearchResult } from '../../hooks/useSearch'
import { useRecentBoards } from '../../hooks/useRecentBoards'

// Represents a navigable item in the search results
type NavigableItem =
  | { type: 'board', id: string, to: string, params: { boardId: string } }
  | { type: 'task', id: string, to: string, params: { boardId: string }, search: { cardId: string } }
  | { type: 'recent', id: string, to: string, params: { boardId: string } }

export function SearchModal() {
  const { isOpen, sessionKey, boardContext, close } = useSearchModal()

  if (!isOpen) return null

  return createPortal(
    <SearchModalContent key={sessionKey} close={close} boardContext={boardContext} />,
    document.body
  )
}

interface BoardContext {
  id: string
  name: string
}

interface SearchModalContentProps {
  close: () => void
  boardContext: BoardContext | null
}

function SearchModalContent({ close, boardContext }: SearchModalContentProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [filterToBoard, setFilterToBoard] = useState(!!boardContext)
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Track navigable items from search results
  const [navigableItems, setNavigableItems] = useState<NavigableItem[]>([])

  // Compute effective boardId for search filtering
  const effectiveBoardId = filterToBoard && boardContext ? boardContext.id : undefined

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  // Callback to handle items change - also resets selection
  const handleItemsChange = useCallback((items: NavigableItem[]) => {
    setNavigableItems(items)
    setSelectedIndex(0)
  }, [])

  // Auto-focus input when modal opens
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Focus trap
  useEffect(() => {
    const modal = modalRef.current
    if (!modal) return

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'input, button, a[href], [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    modal.addEventListener('keydown', handleTabKey)
    return () => modal.removeEventListener('keydown', handleTabKey)
  }, [])

  // Keyboard navigation for search results
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (navigableItems.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => 
          prev < navigableItems.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : navigableItems.length - 1
        )
        break
      case 'Enter': {
        e.preventDefault()
        const item = navigableItems[selectedIndex]
        if (!item) return
        
        close()
        if (item.type === 'task') {
          navigate({ to: item.to, params: item.params, search: item.search })
        } else {
          navigate({ to: item.to, params: item.params })
        }
        break
      }
    }
  }, [navigableItems, selectedIndex, close, navigate])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      close()
    }
  }

  return (
    <div
      className="fixed inset-0 z-10000 flex items-start justify-center bg-black/80 pt-[10vh]"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        ref={modalRef}
        className="bg-surface shadow-brutal-xl animate-in fade-in zoom-in-95 flex w-full max-w-2xl flex-col rounded-none border border-black duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative border-b border-black">
          <Search
            size={20}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={filterToBoard && boardContext ? `Search in ${boardContext.name}...` : 'Search boards and tasks...'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="font-heading w-full rounded-none border-none bg-transparent py-4 pr-4 pl-12 text-sm font-extrabold tracking-wider text-black uppercase outline-none placeholder:text-gray-400 placeholder:normal-case"
            aria-label="Search query"
          />
          <kbd className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 rounded-none border border-black bg-black/5 px-2 py-1 text-xs font-bold text-gray-500">
            ESC
          </kbd>
        </div>

        {filterToBoard && boardContext && (
          <div className="flex items-center justify-between border-b border-black/10 bg-black/5 px-4 py-2">
            <span className="text-xs font-bold text-gray-600">
              Searching in <span className="text-black">{boardContext.name}</span>
            </span>
            <button
              onClick={() => setFilterToBoard(false)}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-black"
            >
              <X size={12} />
              Search all
            </button>
          </div>
        )}

        <SearchResults 
          query={debouncedQuery} 
          onNavigate={close}
          selectedIndex={selectedIndex}
          onItemsChange={handleItemsChange}
          boardId={effectiveBoardId}
        />
      </div>
    </div>
  )
}

interface SearchResultsProps {
  query: string
  onNavigate: () => void
  selectedIndex: number
  onItemsChange: (items: NavigableItem[]) => void
  boardId?: string
}

function SearchResults({ query, onNavigate, selectedIndex, onItemsChange, boardId }: SearchResultsProps) {
  const { data, isLoading } = useSearch(query, { boardId })
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { boards, tasks } = useMemo(() => {
    if (!data?.data) return { boards: [], tasks: [] }
    return {
      boards: data.data.filter((r): r is BoardSearchResult => r.type === 'board'),
      tasks: data.data.filter((r): r is TaskSearchResult => r.type === 'task'),
    }
  }, [data])

  // Build navigable items and report to parent
  const navigableItems = useMemo((): NavigableItem[] => {
    const items: NavigableItem[] = []
    
    boards.forEach((board) => {
      items.push({
        type: 'board',
        id: board.id,
        to: '/board/$boardId',
        params: { boardId: board.id },
      })
    })
    
    tasks.forEach((task) => {
      items.push({
        type: 'task',
        id: task.id,
        to: '/board/$boardId',
        params: { boardId: task.boardId },
        search: { cardId: task.id },
      })
    })
    
    return items
  }, [boards, tasks])

  // Report navigable items to parent for keyboard navigation
  useEffect(() => {
    if (query.length >= 2) {
      onItemsChange(navigableItems)
    }
  }, [navigableItems, query.length, onItemsChange])

  // Scroll selected item into view
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const selectedElement = container.querySelector('[data-selected="true"]')
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  const hasResults = boards.length > 0 || tasks.length > 0
  const showMinLength = query.length > 0 && query.length < 2

  if (showMinLength) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Enter at least 2 characters to search
      </div>
    )
  }

  if (query.length < 2) {
    return (
      <RecentBoardsSection 
        onNavigate={onNavigate} 
        selectedIndex={selectedIndex}
        onItemsChange={onItemsChange}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="font-heading p-6 text-center font-extrabold text-black uppercase">
        Searching...
      </div>
    )
  }

  if (!hasResults) {
    return (
      <div className="p-6 text-center">
        <p className="font-bold text-black uppercase">No results for "{query}"</p>
        <p className="mt-1 text-sm text-gray-500">Try different keywords</p>
      </div>
    )
  }

  // Boards are at indices 0..boards.length-1
  // Tasks are at indices boards.length..boards.length+tasks.length-1
  const boardsOffset = 0
  const tasksOffset = boards.length

  return (
    <div ref={scrollContainerRef} className="max-h-96 overflow-y-auto">
      {boards.length > 0 && (
        <div className="border-b border-black/10 p-2">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-bold text-gray-500 uppercase">
            <LayoutGrid size={14} />
            Boards
          </div>
          {boards.map((board, i) => {
            const isSelected = boardsOffset + i === selectedIndex
            return (
              <Link
                key={board.id}
                to="/board/$boardId"
                params={{ boardId: board.id }}
                onClick={onNavigate}
                className={`block rounded-none px-2 py-2 transition-colors ${
                  isSelected ? 'bg-accent' : 'hover:bg-accent'
                }`}
                data-selected={isSelected}
              >
                <span className="font-heading text-sm font-extrabold text-black uppercase">
                  {board.name}
                </span>
                {board.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-600">
                    {board.description}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="p-2">
          <div className="mb-2 flex items-center gap-2 px-2 text-xs font-bold text-gray-500 uppercase">
            <FileText size={14} />
            Tasks
          </div>
          {tasks.map((task, i) => {
            const isSelected = tasksOffset + i === selectedIndex
            return (
              <Link
                key={task.id}
                to="/board/$boardId"
                params={{ boardId: task.boardId }}
                search={{ cardId: task.id }}
                onClick={onNavigate}
                className={`block rounded-none px-2 py-2 transition-colors ${
                  isSelected ? 'bg-accent' : 'hover:bg-accent'
                }`}
                data-selected={isSelected}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-sm font-extrabold text-black uppercase">
                    {task.title}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-gray-500">
                    in {task.boardName}
                  </span>
                </div>
                {task.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-gray-600">
                    {task.description}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface RecentBoardsSectionProps {
  onNavigate: () => void
  selectedIndex: number
  onItemsChange: (items: NavigableItem[]) => void
}

function RecentBoardsSection({ onNavigate, selectedIndex, onItemsChange }: RecentBoardsSectionProps) {
  const { data: recentBoards, isLoading } = useRecentBoards()

  // Build navigable items for recent boards
  const navigableItems = useMemo((): NavigableItem[] => {
    if (!recentBoards) return []
    return recentBoards.map((board) => ({
      type: 'recent' as const,
      id: board.id,
      to: '/board/$boardId',
      params: { boardId: board.id },
    }))
  }, [recentBoards])

  // Report navigable items to parent
  useEffect(() => {
    onItemsChange(navigableItems)
  }, [navigableItems, onItemsChange])

  // Scroll selected item into view
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    const selectedElement = container.querySelector('[data-selected="true"]')
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (isLoading) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">
        Loading recent boards...
      </div>
    )
  }

  if (!recentBoards || recentBoards.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-500">Type to search boards and tasks</p>
        <p className="mt-1 text-xs text-gray-400">
          Tip: Use <kbd className="rounded-none border border-black/20 bg-black/5 px-1">Cmd+K</kbd> or{' '}
          <kbd className="rounded-none border border-black/20 bg-black/5 px-1">Ctrl+K</kbd> to open search anywhere
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollContainerRef} className="max-h-96 overflow-y-auto p-2">
      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-bold text-gray-500 uppercase">
        <Clock size={14} />
        Recent Boards
      </div>
      {recentBoards.map((board, i) => {
        const isSelected = i === selectedIndex
        return (
          <Link
            key={board.id}
            to="/board/$boardId"
            params={{ boardId: board.id }}
            onClick={onNavigate}
            className={`block rounded-none px-2 py-2 transition-colors ${
              isSelected ? 'bg-accent' : 'hover:bg-accent'
            }`}
            data-selected={isSelected}
          >
            <span className="font-heading text-sm font-extrabold text-black uppercase">
              {board.name}
            </span>
            {board.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-gray-600">
                {board.description}
              </p>
            )}
          </Link>
        )
      })}
    </div>
  )
}
