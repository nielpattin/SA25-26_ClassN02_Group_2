import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Checklist as ChecklistType, ChecklistItem } from '../CardModalTypes'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { Input } from '../ui/Input'
import { Progress } from '../ui/Progress'

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
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-start gap-4 group">
        <div className="flex-1">
          {isEditingTitle ? (
            <div className="flex flex-col gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
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
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (editedTitle.trim()) updateChecklist.mutate(editedTitle.trim())
                  }}
                >
                  Save
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  onClick={() => {
                    setEditedTitle(checklist.title)
                    setIsEditingTitle(false)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <span className="font-heading text-[14px] font-extrabold uppercase tracking-widest text-black cursor-pointer hover:underline underline-offset-4" onClick={() => setIsEditingTitle(true)}>
              {checklist.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 pt-1">
          <span className="text-[11px] font-extrabold text-black/40 uppercase leading-none">{completedCount}/{totalCount}</span>
          <button 
            onClick={() => deleteChecklist.mutate()}
            className="bg-white border-2 border-black text-black cursor-pointer w-8 h-8 flex items-center justify-center transition-all hover:bg-text-danger hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm opacity-0 group-hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <Progress value={progress} className="w-full" />

      <div className="flex flex-col gap-1">
        {items.map((item: ChecklistItem) => (
          <div key={item.id} className={`flex flex-col gap-2 p-2 bg-white border-2 border-black shadow-brutal-sm transition-all hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 group ${item.isCompleted && editingItemId !== item.id ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-4">
              <Checkbox 
                checked={item.isCompleted} 
                onChange={() => toggleItem.mutate(item.id)} 
              />
              <div className="flex-1">
                {editingItemId === item.id ? (
                  <Input
                    value={editedItemContent}
                    onChange={(e) => setEditedItemContent(e.target.value)}
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
                    className={`text-[14px] font-semibold text-black leading-tight cursor-pointer hover:underline decoration-2 ${item.isCompleted ? 'line-through decoration-black/30' : ''}`}
                    onClick={() => {
                      setEditingItemId(item.id)
                      setEditedItemContent(item.content)
                    }}
                  >
                    {item.content}
                  </span>
                )}
              </div>
              <button 
                onClick={() => deleteItem.mutate(item.id)}
                className="bg-white border-2 border-black text-black cursor-pointer w-8 h-8 flex items-center justify-center transition-all hover:bg-text-danger hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm opacity-0 group-hover:opacity-100 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
            {editingItemId === item.id && (
              <div className="flex gap-2 ml-9">
                <Button 
                  size="sm"
                  onClick={() => {
                    if (editedItemContent.trim()) {
                      updateItem.mutate({ itemId: item.id, content: editedItemContent.trim() })
                    }
                  }}
                >
                  Save
                </Button>
                <Button 
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingItemId(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isAddingItem ? (
        <div className="flex flex-col gap-2">
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
          />
          <div className="flex gap-2">
            <Button 
              size="sm"
              onClick={() => {
                if (newItemContent) addItem.mutate(newItemContent)
              }}
              disabled={!newItemContent}
            >
              Add
            </Button>
            <Button 
              size="sm"
              variant="secondary"
              onClick={() => {
                setNewItemContent('')
                setIsAddingItem(false)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" fullWidth onClick={() => setIsAddingItem(true)} className="justify-start! px-3!">
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
    <div className="flex flex-col gap-3 p-4 border-2 border-black bg-white shadow-brutal-md">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Checklist title"
        autoFocus
      />
      <div className="flex gap-2.5">
        <Button 
          onClick={() => {
            if (title) {
              onCreate(title)
              setTitle('')
              setIsOpen(false)
            }
          }}
          disabled={!title}
          className="flex-1"
        >
          Add
        </Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}
