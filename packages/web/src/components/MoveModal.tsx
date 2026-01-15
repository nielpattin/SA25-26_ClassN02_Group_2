import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Column, Board, Card } from './CardModalTypes'
import './MoveModal.css'

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
      const { data, error } = await api.columns.board({ boardId: selectedBoardId }).get()
      if (error) throw error
      return data as unknown as Column[]
    },
    enabled: !!selectedBoardId
  })

  // Fetch tasks for selected column to calculate position
  const { data: tasks = [] } = useQuery<Card[]>({
    queryKey: ['tasks', selectedColumnId],
    queryFn: async () => {
      const { data, error } = await api.tasks.column({ columnId: selectedColumnId }).get()
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
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    <div className="modal-overlay move-overlay" onClick={onCancel}>
      <div className="move-modal" onClick={(e) => e.stopPropagation()}>
        <div className="move-header">
          <h2 className="move-title">Move Card</h2>
          <button className="move-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="move-body">
          <div className="move-field">
            <label className="move-label">Board</label>
            <select 
              className="brutal-select"
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
            >
              {boards.map(board => (
                <option key={board.id} value={board.id}>{board.name}</option>
              ))}
            </select>
          </div>

          <div className="move-row">
            <div className="move-field flex-2">
              <label className="move-label">Column</label>
              <select 
                className="brutal-select"
                value={selectedColumnId}
                onChange={(e) => setSelectedColumnId(e.target.value)}
              >
                {columns.map(column => (
                  <option key={column.id} value={column.id}>{column.name}</option>
                ))}
              </select>
            </div>
            <div className="move-field flex-1">
              <label className="move-label">Position</label>
              <Input
                type="number"
                min={1}
                max={maxPosition}
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          
          <div className="move-actions">
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
