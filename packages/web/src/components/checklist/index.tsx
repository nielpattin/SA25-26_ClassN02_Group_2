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
      const { error } = await api.v1.checklists({ id: checklist.id }).patch({ title })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      setIsEditingTitle(false)
    }
  })

  const deleteChecklist = useMutation({
    mutationFn: async () => {
      const { error } = await api.v1.checklists({ id: checklist.id }).delete()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
  })

  const addItem = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await api.v1.checklists.items.post({
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
      const { error } = await api.v1.checklists.items({ id: itemId }).toggle.post()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
  })

  const updateItem = useMutation({
    mutationFn: async ({ itemId, content }: { itemId: string; content: string }) => {
      const { error } = await api.v1.checklists.items({ id: itemId }).patch({ content })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      setEditingItemId(null)
    }
  })

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await api.v1.checklists.items({ id: itemId }).delete()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
  })

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="group flex items-center gap-4">
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
              <span className="font-heading cursor-pointer text-[14px] font-extrabold tracking-widest text-black uppercase underline-offset-4 hover:underline" onClick={() => setIsEditingTitle(true)}>
                {checklist.title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 pt-1">
            <span className="text-[11px] leading-none font-extrabold text-black/40 uppercase">{Math.round(progress)}%</span>
            <button
              onClick={() => deleteChecklist.mutate()}
              className="hover:bg-text-danger hover:shadow-brutal-sm flex h-8 w-8 cursor-pointer items-center justify-center border border-black bg-white text-black opacity-0 transition-all group-hover:opacity-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      <div className="flex flex-col gap-1">
        {items.map((item: ChecklistItem) => (
          <div key={item.id} className="shadow-brutal-sm hover:shadow-brutal-md group flex flex-col gap-2 border border-black bg-white p-2 transition-all hover:-translate-x-0.5 hover:-translate-y-0.5">
            <div className="flex items-center gap-4">
              <div className={`flex flex-1 items-center gap-4 ${item.isCompleted && editingItemId !== item.id ? 'opacity-60' : ''}`}>
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
                      className={`cursor-pointer text-[14px] leading-tight font-semibold text-black decoration-2 ${item.isCompleted ? 'line-through decoration-black/30' : ''}`}
                      onClick={() => {
                        setEditingItemId(item.id)
                        setEditedItemContent(item.content)
                      }}
                    >
                      {item.content}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteItem.mutate(item.id)}
                className="hover:bg-text-danger hover:shadow-brutal-sm flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center border border-black bg-white text-black opacity-0 transition-all group-hover:opacity-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            {editingItemId === item.id && (
              <div className="ml-9 flex gap-2">
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
              size="md"
              onClick={() => {
                if (newItemContent) addItem.mutate(newItemContent)
              }}
              disabled={!newItemContent}
            >
              Add
            </Button>
            <Button
              size="md"
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
        <Button variant="secondary" size="md" fullWidth onClick={() => setIsAddingItem(true)} className="justify-start! px-3!">
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
    <div className="shadow-brutal-md flex flex-col gap-3 border border-black bg-white p-4">
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
