import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useState, useRef, useLayoutEffect, useMemo, useCallback, memo } from 'react'
import { Plus, MoreHorizontal, ChevronRight, CheckSquare, Copy, ExternalLink, Archive, Pencil } from 'lucide-react'
import { useBoardSocket, setDragging as setGlobalDragging } from '../hooks/useBoardSocket'
import { CardModal } from '../components/CardModal'
import { Dropdown } from '../components/Dropdown'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const Route = createFileRoute('/board/$boardId')({
  component: BoardComponent,
})

type Column = { id: string; name: string; position: string; boardId: string }
type CardLabel = { id: string; name: string; color: string }
type ChecklistProgress = { completed: number; total: number }
type Board = { id: string; name: string }
type Card = {
  id: string
  title: string
  position: string
  columnId: string
  dueDate: string | Date | null
  description?: string | null
  createdAt?: Date | null
  labels?: CardLabel[]
  checklistProgress?: ChecklistProgress | null
  attachmentsCount?: number
}

function BoardComponent() {
  const { boardId } = Route.useParams()
  const queryClient = useQueryClient()
  const [newColumnName, setNewColumnName] = useState('')
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  
  // Data Fetching
  useBoardSocket(boardId)

  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const { data, error } = await api.v1.boards({ id: boardId }).get()
      if (error) throw error
      return data
    },
  })

  const { data: serverColumns = [], isLoading: columnsLoading } = useQuery({
    queryKey: ['columns', boardId],
    queryFn: async () => {
      const { data, error } = await api.v1.columns.board({ boardId }).get()
      if (error) throw error
      return (data || []).sort((a, b) => {
        if (a.position !== b.position) return a.position < b.position ? -1 : 1
        return a.id.localeCompare(b.id) // Stable secondary sort
      })
    },
  })

  const { data: allCards = [] } = useQuery({
    queryKey: ['cards', boardId],
    queryFn: async () => {
      const { data, error } = await api.v1.tasks.board({ boardId }).enriched.get()
      if (error) throw error
      return (data || []).sort((a, b) => {
        if (a.position !== b.position) return a.position < b.position ? -1 : 1
        if (a.columnId !== b.columnId) return a.columnId.localeCompare(b.columnId)
        return a.id.localeCompare(b.id) // Stable secondary sort
      }) as Card[]
    },
  })

  const { data: allBoards = [] } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await api.v1.boards.get()
      if (error) throw error
      return (data || []) as Board[]
    },
  })

  // Drag State
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [localColumns, setLocalColumns] = useState<Column[]>([])
  const [placeholderIndex, setPlaceholderIndex] = useState<number | null>(null)

  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [draggedCardData, setDraggedCardData] = useState<Card | null>(null)
  const [localCards, setLocalCards] = useState<Card[]>([])

  // Derived State
  const displayColumns = draggedColumnId ? localColumns : serverColumns
  const displayCards = draggedCardId ? localCards : allCards

  const cardsByColumn = useMemo(() => {
    const map: Record<string, Card[]> = {}
    displayColumns.forEach(col => {
      map[col.id] = []
    })
    displayCards.forEach(card => {
      if (map[card.columnId]) {
        map[card.columnId].push(card)
      }
    })

    return map
  }, [displayColumns, displayCards])

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const ghostRef = useRef<HTMLDivElement>(null)
  const cardGhostRef = useRef<HTMLDivElement>(null)
  const lastMousePos = useRef({ x: 0, y: 0 })
  const dragDirection = useRef({ x: 0, y: 0 })
  const cardRects = useRef<{ id: string, columnId: string, top: number, height: number }[]>([])
  const columnRectsForCards = useRef<{ id: string, left: number, right: number, top: number, bottom: number }[]>([])
  const isDraggingCard = useRef(false)
  const pendingCardDrag = useRef<{ card: Card, x: number, y: number, rect: DOMRect, width: number, height: number } | null>(null)
  const pendingColumnDrag = useRef<{ columnId: string, x: number, y: number, rect: DOMRect, width: number, height: number } | null>(null)

  const [isScrolling, setIsScrolling] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [draggedWidth, setDraggedWidth] = useState(0)
  const [draggedHeight, setDraggedHeight] = useState(0)

  useLayoutEffect(() => {
    if (draggedColumnId && ghostRef.current) {
      ghostRef.current.style.transform = `translate3d(${lastMousePos.current.x - dragOffset.x}px, ${lastMousePos.current.y - dragOffset.y}px, 0) rotate(2deg)`
    }
    if (draggedCardId && cardGhostRef.current) {
      cardGhostRef.current.style.transform = `translate3d(${lastMousePos.current.x - dragOffset.x}px, ${lastMousePos.current.y - dragOffset.y}px, 0)`
    }
  }, [draggedColumnId, draggedCardId, dragOffset])

  // Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    
    const target = e.target as HTMLElement
    if (
      target.closest('button') || 
      target.closest('a') || 
      target.closest('[data-role="card"]') || 
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[data-role="column-header"]')
    ) return

    setIsScrolling(true)
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft)
    setScrollLeft(scrollContainerRef.current.scrollLeft)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const dx = e.clientX - lastMousePos.current.x
    const dy = e.clientY - lastMousePos.current.y
    if (dx !== 0) dragDirection.current.x = dx > 0 ? 1 : -1
    if (dy !== 0) dragDirection.current.y = dy > 0 ? 1 : -1
    
    lastMousePos.current = { x: e.clientX, y: e.clientY }
    
    if (pendingCardDrag.current) {
      const { x, y, card, rect, width, height } = pendingCardDrag.current
      const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))
      
      if (dist > 5) {
        if (scrollContainerRef.current) {
          const cols = Array.from(scrollContainerRef.current.querySelectorAll('[data-role="column"]'))
          columnRectsForCards.current = cols.map((col) => {
            const r = col.getBoundingClientRect()
            const columnId = (col as HTMLElement).dataset.columnId!
            return {
              id: columnId,
              left: r.left,
              right: r.right,
              top: r.top,
              bottom: r.bottom
            }
          })

          const items = Array.from(scrollContainerRef.current.querySelectorAll('[data-role="card-wrapper"]'))
          cardRects.current = items.map((item) => {
            const r = item.getBoundingClientRect()
            const id = (item as HTMLElement).dataset.cardId!
            const columnId = (item as HTMLElement).dataset.columnId!
            return {
              id,
              columnId,
              top: r.top,
              height: r.height
            }
          })
        }

        setLocalCards(allCards)
        setDraggedCardId(card.id)
        setDraggedCardData(card)
        setDraggedWidth(width)
        setDraggedHeight(height)
        
        setDragOffset({
          x: x - rect.left,
          y: y - rect.top
        })
        setGlobalDragging(true)
        isDraggingCard.current = true
        pendingCardDrag.current = null
      }
    }

    if (pendingColumnDrag.current) {
      const { x, y, columnId, rect, width, height } = pendingColumnDrag.current
      const dist = Math.sqrt(Math.pow(e.clientX - x, 2) + Math.pow(e.clientY - y, 2))
      
      if (dist > 5) {
        setLocalColumns(serverColumns)
        setDraggedColumnId(columnId)
        setDraggedWidth(width)
        setDraggedHeight(height)
        
        setDragOffset({
          x: x - rect.left,
          y: y - rect.top
        })
        setGlobalDragging(true)
        
        const index = serverColumns.findIndex(c => c.id === columnId)
        setPlaceholderIndex(index)
        pendingColumnDrag.current = null
      }
    }

    if (draggedColumnId) {
      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0) rotate(2deg)`
      }
      
      if (scrollContainerRef.current) {
        const colElements = Array.from(scrollContainerRef.current.querySelectorAll('[data-role="column"]'))
        const otherCols = colElements
          .map((el) => ({ 
            id: (el as HTMLElement).dataset.columnId!, 
            rect: el.getBoundingClientRect() 
          }))
          .filter(c => c.id !== draggedColumnId)

        let newIndex = placeholderIndex ?? 0
        const draggedMidX = e.clientX - dragOffset.x + draggedWidth / 2

        for (let i = 0; i < otherCols.length; i++) {
          const { rect } = otherCols[i]
          const neighborMidX = rect.left + rect.width / 2
          
          if (draggedMidX > neighborMidX && i >= (placeholderIndex ?? 0)) {
            newIndex = i + 1
          } else if (draggedMidX < neighborMidX && i < (placeholderIndex ?? 0)) {
            newIndex = i
            break
          }
        }
        
        if (newIndex !== placeholderIndex) {
            setPlaceholderIndex(newIndex)
            
            setLocalColumns(prev => {
              const filtered = prev.filter(c => c.id !== draggedColumnId)
              const draggedCol = prev.find(c => c.id === draggedColumnId)
              if (!draggedCol) return prev
              const updated = [...filtered]
              updated.splice(newIndex, 0, draggedCol)
              return updated
            })
          }
      }
      return
    }

    if (draggedCardId) {
      if (cardGhostRef.current) {
        cardGhostRef.current.style.transform = `translate3d(${e.clientX - dragOffset.x}px, ${e.clientY - dragOffset.y}px, 0)`
      }

      if (scrollContainerRef.current) {
        const colElements = Array.from(scrollContainerRef.current.querySelectorAll('[data-role="column"]'))
        const colRects = colElements.map((el) => {
          const r = el.getBoundingClientRect()
          const columnId = (el as HTMLElement).dataset.columnId!
          return { id: columnId, left: r.left, right: r.right }
        })

        const hoveredCol = colRects.find(r => e.clientX >= r.left && e.clientX <= r.right)
        if (hoveredCol) {
          const targetColId = hoveredCol.id
          const cardElements = Array.from(scrollContainerRef.current.querySelectorAll(`[data-role="card-wrapper"][data-column-id="${targetColId}"]:not([data-state="placeholder"])`))
          
          const rects = cardElements.map(el => {
            const r = el.getBoundingClientRect()
            return { id: (el as HTMLElement).dataset.cardId!, top: r.top, bottom: r.bottom, height: r.height }
          })

          const isMovingDown = dragDirection.current.y > 0
          let targetNeighborId: string | null = null
          let relativePos: 'before' | 'after' = 'before'
          
          const draggedMidY = e.clientY - dragOffset.y + draggedHeight / 2

          for (let i = 0; i < rects.length; i++) {
            const r = rects[i]
            const neighborMidY = r.top + r.height / 2
            
            if (draggedMidY > neighborMidY) {
              targetNeighborId = r.id
              relativePos = 'after'
            } else {
              targetNeighborId = r.id
              relativePos = 'before'
              break
            }
          }

          setLocalCards(prev => {
            const card = prev.find(c => c.id === draggedCardId)
            if (!card) return prev
            
            // If no neighbor found, it means the column is empty or we are at the very top/bottom
            const updated = prev.filter(c => c.id !== draggedCardId)
            const updatedCard = { ...card, columnId: targetColId }
            
            let finalIdx = -1
            if (!targetNeighborId) {
              // Empty column or at the very top (if moving up) or bottom (if moving down)
              const cardsInTarget = updated.filter(c => c.columnId === targetColId)
              if (cardsInTarget.length === 0) {
                // Find column insert position
                const colIdx = displayColumns.findIndex(c => c.id === targetColId)
                for (let i = colIdx + 1; i < displayColumns.length; i++) {
                  const firstInNext = updated.find(c => c.columnId === displayColumns[i].id)
                  if (firstInNext) {
                    finalIdx = updated.indexOf(firstInNext)
                    break
                  }
                }
                if (finalIdx === -1) finalIdx = updated.length
              } else {
                // If moving up and no neighbor met threshold, it's at the top
                if (!isMovingDown) {
                  finalIdx = updated.indexOf(cardsInTarget[0])
                } else {
                  // If moving down and no neighbor met threshold, it's at the bottom
                  finalIdx = updated.indexOf(cardsInTarget[cardsInTarget.length - 1]) + 1
                }
              }
            } else {
              const neighborIdx = updated.findIndex(c => c.id === targetNeighborId)
              finalIdx = relativePos === 'before' ? neighborIdx : neighborIdx + 1
            }

            // Check if position actually changed to avoid thrashing
            if (prev[updated.indexOf(updatedCard)]?.id === draggedCardId) {
               // This is tricky because updatedCard isn't in 'updated' yet.
            }
            
            const currentIdx = prev.findIndex(c => c.id === draggedCardId)
            if (currentIdx === finalIdx && prev[currentIdx].columnId === targetColId) {
              return prev
            }

            const result = [...updated]
            result.splice(finalIdx, 0, updatedCard)
            return result
          })
        }
      }
      return
    }

    if (!isScrolling || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = (x - startX) * 1.5
    scrollContainerRef.current.scrollLeft = scrollLeft - walk
  }, [draggedColumnId, draggedCardId, dragOffset, placeholderIndex, isScrolling, startX, scrollLeft, allCards, displayColumns, serverColumns, draggedWidth, draggedHeight])

  const handleMouseUpOrLeave = useCallback(() => {
    pendingCardDrag.current = null
    pendingColumnDrag.current = null

    if (draggedColumnId) {
      const finalIndex = placeholderIndex
      const finalColumns = [...localColumns]
      
      if (finalIndex !== null) {
        queryClient.setQueryData(['columns', boardId], finalColumns)
        
        const beforeCol = finalColumns[finalIndex - 1]
        const afterCol = finalColumns[finalIndex + 1]
        
        api.v1.columns({ id: draggedColumnId }).move.patch({
          beforeColumnId: beforeCol?.id,
          afterColumnId: afterCol?.id
        }).then(({ error }) => {
          if (error) {
            queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
          }
        }).catch(() => {
          queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
        })
      }

      setDraggedColumnId(null)
      setPlaceholderIndex(null)
      setGlobalDragging(false)
    }

    if (draggedCardId) {
      const finalCards = [...localCards]
      const cardIdx = finalCards.findIndex(c => c.id === draggedCardId)
      
      if (cardIdx !== -1) {
        queryClient.setQueryData(['cards', boardId], finalCards)

        const droppedCard = finalCards[cardIdx]
        const colId = droppedCard.columnId
        const colCards = finalCards.filter(c => c.columnId === colId)
        const inColIdx = colCards.indexOf(droppedCard)
        
        const beforeCard = colCards[inColIdx - 1]
        const afterCard = colCards[inColIdx + 1]

        api.v1.tasks({ id: draggedCardId }).move.patch({
          columnId: colId,
          beforeTaskId: beforeCard?.id,
          afterTaskId: afterCard?.id
        }).then(({ error }) => {
          if (error) {
            queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
          }
        }).catch(() => {
          queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
        })
      }

      setDraggedCardId(null)
      setDraggedCardData(null)
      setGlobalDragging(false)
      isDraggingCard.current = false
    }

    pendingCardDrag.current = null
    setIsScrolling(false)
  }, [draggedColumnId, draggedCardId, placeholderIndex, localColumns, localCards, boardId, queryClient])

  const handleColumnDragStart = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return
    const header = e.currentTarget as HTMLElement
    const columnId = header.closest('[data-role="column"]')?.getAttribute('data-column-id')
    if (!columnId) return

    const rect = header.getBoundingClientRect()
    
    pendingColumnDrag.current = {
      columnId,
      x: e.clientX,
      y: e.clientY,
      rect,
      width: rect.width,
      height: rect.height
    }
  }, [])

  const handleCardDragStart = useCallback((card: Card, e: React.MouseEvent) => {
    if (e.button !== 0) return
    
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    
    pendingCardDrag.current = {
      card,
      x: e.clientX,
      y: e.clientY,
      rect,
      width: rect.width,
      height: rect.height
    }
  }, [])

  const handleAddTask = useCallback(async (columnId: string, title: string) => {

    const { error } = await api.v1.tasks.post({ title, columnId })
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  }, [boardId, queryClient])

  const handleRenameColumn = useCallback(async (columnId: string, newName: string) => {
    const { error } = await api.v1.columns({ id: columnId }).patch({ name: newName })
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
    }
  }, [boardId, queryClient])

  const handleArchiveColumn = useCallback(async (columnId: string) => {
    const { error } = await api.v1.columns({ id: columnId }).archive.post()
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  }, [boardId, queryClient])

  const handleCopyColumn = useCallback(async (columnId: string) => {
    const { error } = await api.v1.columns({ id: columnId }).copy.post()
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  }, [boardId, queryClient])

  const handleMoveColumnToBoard = useCallback(async (columnId: string, targetBoardId: string) => {
    const { error } = await api.v1.columns({ id: columnId })['move-to-board'].patch({ targetBoardId })
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  }, [boardId, queryClient])

  if (boardLoading || columnsLoading) return <div className="font-heading bg-canvas flex h-screen items-center justify-center font-extrabold text-black uppercase">Loading workspace...</div>
  if (!board) return <div className="font-heading bg-canvas flex h-screen items-center justify-center font-extrabold text-black uppercase">Error: Page not found</div>

  const draggedColumn = draggedColumnId ? displayColumns.find(c => c.id === draggedColumnId) : null
  const isAnyDragging = !!draggedCardId || !!draggedColumnId

  return (
    <div className="bg-canvas font-body color-text flex h-screen flex-col overflow-hidden p-0">
      <header className="bg-canvas flex shrink-0 items-center justify-between border-b border-black px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="hover:bg-accent hover:shadow-brutal-sm text-sm font-extrabold text-black uppercase hover:px-1">Workspace</Link>
          <ChevronRight size={14} className="text-text-muted" />
          <h1 className="font-heading m-0 text-[18px] font-bold text-black">{board.name}</h1>
        </div>
        <div className="header-right">
        </div>
      </header>

      <div 
        className={`bg-canvas flex flex-1 cursor-grab items-start gap-(--board-gap,24px) overflow-x-auto overflow-y-hidden px-16 py-12 ${isScrolling ? 'cursor-grabbing' : ''} ${draggedColumnId ? 'cursor-grabbing' : ''} ${draggedCardId ? 'cursor-grabbing' : ''}`}
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        {displayColumns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            cards={cardsByColumn[column.id] || []}
            onCardClick={setSelectedCardId}
            onDragStart={handleColumnDragStart}
            onCardDragStart={handleCardDragStart}
            onAddTask={handleAddTask}
            onRenameColumn={handleRenameColumn}
            onArchiveColumn={handleArchiveColumn}
            onCopyColumn={handleCopyColumn}
            onMoveColumnToBoard={handleMoveColumnToBoard}
            boards={allBoards}
            isDragging={column.id === draggedColumnId}
            draggedCardId={draggedCardId}
            isAnyDragging={isAnyDragging}
          />
        ))}
        <div className={`w-(--board-column-width,300px) min-w-(--board-column-width,300px) shrink-0 px-1 ${isAnyDragging ? 'pointer-events-none' : ''}`}>
          <Input 
            className="shadow-brutal-md font-heading hover:shadow-brutal-xl! focus:bg-accent focus:shadow-brutal-lg text-[13px] font-extrabold tracking-wider uppercase hover:-translate-px" 
            placeholder="+ Add a group" 
            value={newColumnName}
            onChange={e => setNewColumnName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newColumnName) {
                api.v1.columns.post({ name: newColumnName, boardId }).then(() => {
                  queryClient.invalidateQueries({ queryKey: ['columns', boardId] })
                  setNewColumnName('')
                })
              }
            }}
          />
        </div>
      </div>

      {draggedColumn && (
        <div 
          className="bg-surface shadow-brutal-2xl! pointer-events-none fixed top-0 left-0 z-1000 w-(--board-column-width,300px) rounded-none border border-black p-(--column-padding,16px) opacity-80 will-change-transform"
          ref={ghostRef}
        >
          <h4 className="font-heading relative mb-5 flex shrink-0 items-center gap-2.5 border-b border-black p-2 text-(length:--column-header-size,14px) font-extrabold tracking-widest text-black uppercase">
            <span className="flex-1 cursor-text truncate">{draggedColumn.name}</span>
            <span className="bg-accent ml-auto border border-black px-2 py-0.5 text-[11px] font-extrabold">{cardsByColumn[draggedColumn.id]?.length || 0}</span>
            <MoreHorizontal size={14} className="text-text-muted cursor-pointer" />
          </h4>
        </div>
      )}

       {draggedCardData && (
        <div className="pointer-events-none fixed top-0 left-0 z-1000 w-[calc(var(--board-column-width,300px)-48px)] opacity-90 will-change-transform" ref={cardGhostRef}>
          <div className="shadow-brutal-2xl! rotate-2 border border-black">
            <CardItem card={draggedCardData} onCardClick={() => {}} isAnyDragging={isAnyDragging} />
          </div>
        </div>
      )}


      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          boardId={boardId}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  )
}

const BoardColumn = memo(({ 
  column, 
  cards, 
  onCardClick,
  onDragStart,
  onCardDragStart,
  onAddTask,
  onRenameColumn,
  onArchiveColumn,
  onCopyColumn,
  onMoveColumnToBoard,
  boards,
  isDragging,
  draggedCardId,
  isAnyDragging
}: { 
  column: Column
  cards: Card[]
  onCardClick: (id: string) => void
  onDragStart: (e: React.MouseEvent) => void
  onCardDragStart: (card: Card, e: React.MouseEvent) => void
  onAddTask: (columnId: string, title: string) => Promise<void>
  onRenameColumn: (columnId: string, newName: string) => Promise<void>
  onArchiveColumn: (columnId: string) => Promise<void>
  onCopyColumn: (columnId: string) => Promise<void>
  onMoveColumnToBoard: (columnId: string, targetBoardId: string) => Promise<void>
  boards: Board[]
  isDragging?: boolean
  draggedCardId: string | null
  isAnyDragging: boolean
}) => {
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [nameValue, setNameValue] = useState(column.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useLayoutEffect(() => {
    if (isAddingTask) {
      inputRef.current?.focus()
    }
  }, [isAddingTask])

  useLayoutEffect(() => {
    if (isEditingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [isEditingName])

  const handleSubmit = async () => {
    if (newTaskTitle.trim()) {
      await onAddTask(column.id, newTaskTitle.trim())
      setNewTaskTitle('')
    }
    setIsAddingTask(false)
  }

  const handleRenameSubmit = async () => {
    if (nameValue.trim() && nameValue.trim() !== column.name) {
      await onRenameColumn(column.id, nameValue.trim())
    } else {
      setNameValue(column.name)
    }
    setIsEditingName(false)
  }

  const menuItems = [
    { label: 'Add Card', icon: <Plus size={14} />, onClick: () => setIsAddingTask(true) },
    { label: 'Rename List', icon: <Pencil size={14} />, onClick: () => setIsEditingName(true) },
    { label: 'Copy List', icon: <Copy size={14} />, onClick: () => onCopyColumn(column.id) },
    { label: 'Archive', icon: <Archive size={14} />, onClick: () => onArchiveColumn(column.id), variant: 'danger' as const },
  ]

  // Add Move options
  const otherBoards = boards.filter(b => b.id !== column.boardId)
  if (otherBoards.length > 0) {
    otherBoards.forEach(board => {
      menuItems.push({
        label: `Move to ${board.name}`,
        icon: <ExternalLink size={14} />,
        onClick: () => onMoveColumnToBoard(column.id, board.id)
      })
    })
  }

  return (
    <div 
      className={`relative flex max-h-full w-(--board-column-width,300px) min-w-(--board-column-width,300px) flex-col rounded-none border p-4 ${isDragging ? 'translate-0! border-dashed border-black/20 bg-black/5 opacity-100 shadow-none!' : 'bg-surface shadow-brutal-lg -translate-x-px -translate-y-px border-black'} ${isAnyDragging ? 'pointer-events-none' : ''}`}
      data-column-id={column.id}
      data-role="column"
    >
      <div className={`flex min-h-0 flex-1 flex-col ${isDragging ? 'invisible' : ''}`}>
        <div className="column-header-container">
          <h4 
            className="font-heading relative mb-5 flex shrink-0 cursor-grab items-center gap-2.5 border-b border-black p-2 text-(length:--column-header-size,14px) font-extrabold tracking-widest text-black uppercase" 
            onMouseDown={onDragStart} 
            data-role="column-header"
          >
            {isEditingName ? (
              <input
                ref={nameInputRef}
                className="font-inherit tracking-inherit m-0 w-full flex-1 border-none bg-transparent p-0 text-inherit uppercase outline-none"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameSubmit()
                  if (e.key === 'Escape') {
                    setNameValue(column.name)
                    setIsEditingName(false)
                  }
                }}
                onMouseDown={e => e.stopPropagation()}
              />
            ) : (
              <span 
                className="flex-1 cursor-text truncate" 
                onClick={(e) => {
                  e.stopPropagation()
                  setIsEditingName(true)
                }}
              >
                {column.name}
              </span>
            )}
            <span className="bg-accent ml-auto border border-black px-2 py-0.5 text-[11px] font-extrabold">{cards.length}</span>
            <div onMouseDown={e => e.stopPropagation()} className="flex items-center">
              <Dropdown 
                trigger={<MoreHorizontal size={14} className={`cursor-pointer ${isMenuOpen ? 'text-black' : 'text-text-muted'}`} />}
                items={menuItems}
                onOpenChange={setIsMenuOpen}
              />
            </div>
          </h4>
        </div>
        <div className="flex min-h-5 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-1 pb-3">
          {cards.map((card) => (
              <CardItem 
                key={card.id} 
                card={card} 
                onCardClick={onCardClick} 
                onCardDragStart={onCardDragStart}
                isDragging={card.id === draggedCardId}
                isAnyDragging={isAnyDragging}
              />
          ))}
          {cards.length === 0 && (
            <div className="text-text-subtle border border-dashed border-black bg-black/5 p-4 text-center text-[12px] font-bold uppercase">No items</div>
          )}
        </div>
        <div className="shrink-0 pt-6">
          {isAddingTask ? (
            <Input
              ref={inputRef}
              className="shadow-brutal-md font-heading text-[13px] font-extrabold tracking-wider uppercase"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              onBlur={handleSubmit}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmit()
                if (e.key === 'Escape') setIsAddingTask(false)
              }}
            />
          ) : (
            <Button 
              fullWidth
              onClick={() => setIsAddingTask(true)}
            >
              <Plus size={14} /> New
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

const CardItem = memo(({ 
  card, 
  onCardClick, 
  onCardDragStart,
  isDragging,
  isAnyDragging
}: { 
  card: Card
  onCardClick: (id: string) => void
  onCardDragStart?: (card: Card, e: React.MouseEvent) => void
  isDragging?: boolean
  isAnyDragging: boolean
}) => {
  const now = new Date()
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const isOverdue = card.dueDate && new Date(card.dueDate) < now
  const isDueSoon = card.dueDate && !isOverdue && new Date(card.dueDate) <= twoDaysFromNow

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    onCardDragStart?.(card, e)
  }, [card, onCardDragStart])

  const handleClick = useCallback(() => {
    onCardClick(card.id)
  }, [card, onCardClick])

  return (
    <div 
      className={`card-wrapper ${isDragging ? 'relative rounded-none border border-dashed border-black bg-black/5 shadow-none! transition-none!' : ''}`}
      onMouseDown={handleMouseDown}
      data-card-id={card.id}
      data-column-id={card.columnId}
      data-role="card-wrapper"
      data-state={isDragging ? 'placeholder' : undefined}
    >
      <div 
        className={`bg-surface shadow-brutal-sm flex cursor-pointer flex-col gap-2 border border-black p-3 text-[14px] transition-[transform,box-shadow,background-color] duration-200 ${isDragging ? 'invisible! transition-none!' : 'hover:bg-accent hover:shadow-brutal-lg hover:-translate-x-0.5 hover:-translate-y-0.5'} ${isAnyDragging ? 'pointer-events-none' : ''}`} 
        onClick={handleClick}
        data-role="card"
      >
        {card.labels && card.labels.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {card.labels.map(l => (
              <div key={l.id} className="h-2 w-10 origin-top rounded-none border border-black shadow-[1px_1px_0px_rgba(0,0,0,0.5)] transition-transform hover:scale-y-150" style={{ background: l.color }} />
            ))}
          </div>
        )}
        <div className="leading-tight font-bold text-black">{card.title}</div>
        {(card.checklistProgress || card.dueDate) && (
          <div className="flex items-center gap-3 text-[11px] font-bold text-black uppercase">
            {card.checklistProgress && (
              <span className="flex items-center gap-1">
                <CheckSquare size={12} />
                {card.checklistProgress.completed}/{card.checklistProgress.total}
              </span>
            )}
            {card.dueDate && (
              <span className={`border border-black px-1.5 py-0.5 ${isOverdue ? 'bg-[#E74C3C] text-white' : isDueSoon ? 'bg-accent text-black' : 'border-transparent bg-white text-black'}`}>
                {new Date(card.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
