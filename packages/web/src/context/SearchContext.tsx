/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface BoardContext {
  id: string
  name: string
}

interface SearchContextValue {
  isOpen: boolean
  sessionKey: number
  boardContext: BoardContext | null
  open: () => void
  close: () => void
  toggle: () => void
  setBoardContext: (board: BoardContext | null) => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [sessionKey, setSessionKey] = useState(0)
  const [boardContext, setBoardContext] = useState<BoardContext | null>(null)

  const open = useCallback(() => {
    setSessionKey(k => k + 1)
    setIsOpen(true)
  }, [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) {
        setSessionKey(k => k + 1)
      }
      return !prev
    })
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + K to toggle search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggle()
      }
      // Esc to close
      if (e.key === 'Escape' && isOpen) {
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, toggle, close])

  return (
    <SearchContext.Provider value={{ isOpen, sessionKey, boardContext, open, close, toggle, setBoardContext }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearchModal() {
  const context = useContext(SearchContext)
  if (!context) {
    throw new Error('useSearchModal must be used within SearchProvider')
  }
  return context
}
