import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Checklist as ChecklistType, ChecklistItem } from '../CardModalTypes'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Input } from '../ui/Input'
import { Progress } from '../ui/Progress'
import './checklist.css'

interface ChecklistProps {
  checklist: ChecklistType
  cardId: string
}

export function Checklist({ checklist, cardId }: ChecklistProps) {
  const queryClient = useQueryClient()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(checklist.title)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editedItemContent, setEditedItemContent] = useState('')
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [newItemContent, setNewItemContent] = useState('')

  const items = checklist.items || []
  const totalCount = items.length
  const completedCount = items.filter(i => i.isCompleted).length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const updateChecklist = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await api.checklists({ id: checklist.id }).patch({ title })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      setIsEditingTitle(false)
    }
  })

  const deleteChecklist = useMutation({
    mutationFn: async () => {
      const { error } = await api.checklists({ id: checklist.id }).delete()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
  })

  const addItem = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await api.checklists.items.post({ 
        checklistId: checklist.id, 
        content
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      setNewItemContent('')
      setIsAddingItem(false)
    }
  })

  const toggleItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await api.checklists.items({ id: itemId }).toggle.post()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
  })

  const updateItem = useMutation({
    mutationFn: async ({ itemId, content }: { itemId: string; content: string }) => {
      const { error } = await api.checklists.items({ id: itemId }).patch({ content })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      setEditingItemId(null)
    }
  })

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await api.checklists.items({ id: itemId }).delete()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
  })

  return (
    <div className="checklist-feature">
      <div className="checklist-header">
        {isEditingTitle ? (
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={() => {
              if (editedTitle.trim() && editedTitle !== checklist.title) {
                updateChecklist.mutate(editedTitle.trim())
              } else {
                setEditedTitle(checklist.title)
                setIsEditingTitle(false)
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && editedTitle.trim()) {
                updateChecklist.mutate(editedTitle.trim())
              } else if (e.key === 'Escape') {
                setEditedTitle(checklist.title)
                setIsEditingTitle(false)
              }
            }}
            autoFocus
          />
        ) : (
          <span className="checklist-title" onClick={() => setIsEditingTitle(true)}>
            {checklist.title}
          </span>
        )}
        <div className="checklist-header-actions">
          <span className="checklist-progress-text">{completedCount}/{totalCount}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => deleteChecklist.mutate()}
            className="delete-checklist-btn"
          >
            <X size={14} />
          </Button>
        </div>
      </div>

      <Progress value={progress} className="checklist-progress-bar" />

      <div className="checklist-items">
        {items.map((item: ChecklistItem) => (
          <div key={item.id} className={`checklist-item-row ${item.isCompleted ? 'completed' : ''}`}>
            <Checkbox 
              checked={item.isCompleted} 
              onChange={() => toggleItem.mutate(item.id)} 
            />
            {editingItemId === item.id ? (
              <Input
                value={editedItemContent}
                onChange={(e) => setEditedItemContent(e.target.value)}
                onBlur={() => {
                  if (editedItemContent.trim() && editedItemContent !== item.content) {
                    updateItem.mutate({ itemId: item.id, content: editedItemContent.trim() })
                  } else {
                    setEditingItemId(null)
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && editedItemContent.trim()) {
                    updateItem.mutate({ itemId: item.id, content: editedItemContent.trim() })
                  } else if (e.key === 'Escape') {
                    setEditingItemId(null)
                  }
                }}
                autoFocus
              />
            ) : (
              <span
                className="checklist-item-content"
                onClick={() => {
                  setEditingItemId(item.id)
                  setEditedItemContent(item.content)
                }}
              >
                {item.content}
              </span>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => deleteItem.mutate(item.id)}
              className="delete-item-btn"
            >
              <X size={14} />
            </Button>
          </div>
        ))}
      </div>

      {isAddingItem ? (
        <div className="add-item-form">
          <Input
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            placeholder="Type and press Enter..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newItemContent) {
                addItem.mutate(newItemContent)
              } else if (e.key === 'Escape') {
                setNewItemContent('')
                setIsAddingItem(false)
              }
            }}
            onBlur={() => {
              if (!newItemContent) setIsAddingItem(false)
            }}
          />
        </div>
      ) : (
        <Button variant="secondary" size="sm" fullWidth onClick={() => setIsAddingItem(true)} className="add-item-trigger">
          <Plus size={14} /> Add Item
        </Button>
      )}
    </div>
  )
}

export function ChecklistCreator({ onCreate }: { onCreate: (title: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')

  if (!isOpen) {
    return (
      <Button variant="secondary" fullWidth onClick={() => setIsOpen(true)}>
        + Add Checklist
      </Button>
    )
  }

  return (
    <div className="checklist-creator-form">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Checklist title"
        autoFocus
      />
      <div className="checklist-creator-actions">
        <Button 
          onClick={() => {
            if (title) {
              onCreate(title)
              setTitle('')
              setIsOpen(false)
            }
          }}
          disabled={!title}
        >
          Add
        </Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
