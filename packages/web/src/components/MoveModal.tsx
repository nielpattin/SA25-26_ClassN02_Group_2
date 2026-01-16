import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Select } from './ui/Select'
import { Column, Board, Card } from './CardModalTypes'

interface MoveModalProps {
  boards: Board[]
  currentBoardId: string
  currentColumnId: string
  cardId: string
  onMove: (columnId: string, beforeTaskId?: string, afterTaskId?: string) => void
  onCancel: () => void
}

export function MoveModal({ boards, currentBoardId, currentColumnId, cardId, onMove, onCancel }: MoveModalProps) {
  const [selectedBoardId, setSelectedBoardId] = useState(currentBoardId)
  const [selectedColumnId, setSelectedColumnId] = useState(currentColumnId)
  const [selectedPosition, setSelectedPosition] = useState(1)

  // Fetch columns for selected board
  const { data: columns = [] } = useQuery<Column[]>({
    queryKey: ['columns', selectedBoardId],
    queryFn: async () => {
      const { data, error } = await api.v1.columns.board({ boardId: selectedBoardId }).get()
      if (error) throw error
      return data as unknown as Column[]
    },
    enabled: !!selectedBoardId
  })

  // Fetch tasks for selected column to calculate position
  const { data: tasks = [] } = useQuery<Card[]>({
    queryKey: ['tasks', selectedColumnId],
    queryFn: async () => {
      const { data, error } = await api.v1.tasks.column({ columnId: selectedColumnId }).get()
      if (error) throw error
      // Filter out current card if it's in this column
      return (data as unknown as Card[]).filter(t => t.id !== cardId)
    },
    enabled: !!selectedColumnId
  })

  // Synchronize column when board changes or columns load
  useEffect(() => {
    if (columns.length > 0) {
      if (selectedBoardId === currentBoardId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedColumnId(currentColumnId)
      } else {
         
        setSelectedColumnId(columns[0].id)
      }
    }
  }, [columns, selectedBoardId, currentBoardId, currentColumnId])

  const maxPosition = tasks.length + 1

  const handleMove = () => {
    let beforeTaskId: string | undefined
    let afterTaskId: string | undefined

    if (selectedPosition === 1) {
      beforeTaskId = tasks[0]?.id
      afterTaskId = undefined
    } else if (selectedPosition >= maxPosition) {
      beforeTaskId = undefined
      afterTaskId = tasks[tasks.length - 1]?.id
    } else {
      afterTaskId = tasks[selectedPosition - 2]?.id
      beforeTaskId = tasks[selectedPosition - 1]?.id
    }

    onMove(selectedColumnId, beforeTaskId, afterTaskId)
  }

  return createPortal(
    <div className="fixed inset-0 z-11000 flex items-center justify-center bg-black/80" onClick={onCancel}>
      <div className="shadow-brutal-xl flex w-[90%] max-w-100 flex-col rounded-none border border-black bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-black px-6 py-4">
          <h2 className="font-heading m-0 text-[18px] font-extrabold text-black uppercase">Move Card</h2>
          <button 
            className="hover:bg-text-danger hover:shadow-brutal-sm flex h-8 w-8 cursor-pointer items-center justify-center border border-black bg-white text-black transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-white active:translate-0 active:shadow-none" 
            onClick={onCancel}
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-col gap-6 p-8">
          <div className="flex flex-col gap-2">
            <label className="font-heading text-[11px] font-extrabold tracking-widest text-black/60 uppercase">Board</label>
            <Select 
              value={selectedBoardId}
              options={boards}
              onChange={setSelectedBoardId}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-2 flex-col gap-2">
              <label className="font-heading text-[11px] font-extrabold tracking-widest text-black/60 uppercase">Column</label>
              <Select 
                value={selectedColumnId}
                options={columns}
                onChange={setSelectedColumnId}
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="font-heading text-[11px] font-extrabold tracking-widest text-black/60 uppercase">Position</label>
              <Input
                type="number"
                min={1}
                max={maxPosition}
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          
          <div className="mt-2 flex flex-col gap-3">
            <Button 
              fullWidth 
              onClick={handleMove}
            >
              Move
            </Button>
            <Button 
              variant="secondary" 
              fullWidth 
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
