import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, File, Trash2, ExternalLink } from 'lucide-react'
import { api } from '../api/client'
import './CardModal.css'

type Card = {
  id: string
  title: string
  description: string | null
  dueDate: string | Date | null
  columnId: string
}

type Attachment = {
  id: string
  cardId: string
  type: string
  url: string
  name: string
  mimeType: string | null
  size: number | null
  createdAt: string
}

type Label = {
  id: string
  name: string
  color: string
  boardId: string
}

type ChecklistItem = {
  id: string
  content: string
  isCompleted: boolean
  checklistId: string
  order: number
}

type Checklist = {
  id: string
  title: string
  cardId: string
  order: number
  items: ChecklistItem[]
}

type CardModalProps = {
  cardId: string
  boardId: string
  onClose: () => void
}

export function CardModal({ cardId, boardId, onClose }: CardModalProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)

  // Fetch card data
  const { data: card, isLoading: cardLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn: async () => {
      const { data, error } = await api.cards({ id: cardId }).get()
      if (error) throw error
      return data as Card
    },
  })

  // Labels
  const { data: boardLabels } = useQuery({
    queryKey: ['labels', boardId],
    queryFn: async () => {
      const { data, error } = await api.labels.board({ boardId }).get()
      if (error) throw error
      return data as Label[]
    },
  })

  const { data: cardLabels } = useQuery({
    queryKey: ['cardLabels', cardId],
    queryFn: async () => {
      const { data, error } = await api.labels.card({ cardId }).get()
      if (error) throw error
      return data as Label[]
    },
  })

  // Checklists
  const { data: checklists } = useQuery({
    queryKey: ['checklists', cardId],
    queryFn: async () => {
      const { data, error } = await api.checklists.card({ cardId }).get()
      if (error) throw error
      return data as Checklist[]
    },
  })

  // Attachments
  const { data: attachments } = useQuery({
    queryKey: ['attachments', cardId],
    queryFn: async () => {
      const { data, error } = await api.attachments.card({ cardId }).get()
      if (error) throw error
      return data as Attachment[]
    },
  })

  // Mutations
  const updateCard = useMutation({
    mutationFn: async (updates: { title?: string; description?: string; dueDate?: string | null }) => {
      const { data, error } = await api.cards({ id: cardId }).patch(updates)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
    },
  })

  const toggleLabel = useMutation({
    mutationFn: async ({ labelId, attached }: { labelId: string; attached: boolean }) => {
      if (attached) {
        const { error } = await api.labels.card({ cardId }).label({ labelId }).delete()
        if (error) throw error
      } else {
        const { error } = await api.labels.card({ cardId }).label({ labelId }).post({})
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardLabels', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    },
  })

  const createChecklist = useMutation({
    mutationFn: async (checklistTitle: string) => {
      const { data, error } = await api.checklists.post({
        title: checklistTitle,
        cardId,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    },
  })

  const createAttachment = useMutation({
    mutationFn: async (data: { type: string; url: string; name: string }) => {
      const { data: result, error } = await api.attachments.post({
        ...data,
        cardId,
      })
      if (error) throw error
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    },
  })

  const deleteAttachment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.attachments({ id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    },
  })

  // Initialize form state when card loads
  if (card && !isInitialized) {
    setTitle(card.title)
    setDescription(card.description || '')
    const dueDateStr = card.dueDate
      ? (typeof card.dueDate === 'string' ? card.dueDate : card.dueDate.toISOString()).split('T')[0]
      : ''
    setDueDate(dueDateStr)
    setIsInitialized(true)
  }

  if (cardLoading || !card) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="loading-state">// Loading card...</div>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    updateCard.mutate({
      title,
      description,
      dueDate: dueDate || null,
    })
  }

  const now = new Date()
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const isOverdue = dueDate && new Date(dueDate) < now
  const isDueSoon = dueDate && !isOverdue && new Date(dueDate) <= twoDaysFromNow

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="modal-title-input"
            onBlur={handleSave}
          />
          <button onClick={onClose} className="modal-close">×</button>
        </div>

        <div className="modal-body">
          {/* Labels Section */}
          <div className="modal-section">
            <h4 className="section-title">&gt; Labels</h4>
            <div className="labels-container">
              {boardLabels?.map((label) => {
                const isAttached = cardLabels?.some((cl) => cl.id === label.id)
                return (
                  <button
                    key={label.id}
                    className={`label-pill ${isAttached ? 'active' : ''}`}
                    style={{ '--label-color': label.color } as React.CSSProperties}
                    onClick={() => toggleLabel.mutate({ labelId: label.id, attached: !!isAttached })}
                  >
                    {label.name}
                  </button>
                )
              })}
              <LabelCreator boardId={boardId} />
            </div>
          </div>

          {/* Due Date Section */}
          <div className="modal-section">
            <h4 className="section-title">&gt; Due Date</h4>
            <div className="due-date-container">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  updateCard.mutate({ dueDate: e.target.value || null })
                }}
                className={`due-date-input ${isOverdue ? 'overdue' : ''} ${isDueSoon ? 'due-soon' : ''}`}
              />
              {dueDate && (
                <button
                  className="clear-date-btn"
                  onClick={() => {
                    setDueDate('')
                    updateCard.mutate({ dueDate: null })
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div className="modal-section">
            <h4 className="section-title">&gt; Description</h4>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              placeholder="Add a description..."
              className="description-input"
            />
          </div>

          {/* Attachments Section */}
          <div className="modal-section">
            <h4 className="section-title">&gt; Attachments</h4>
            <div className="attachments-list">
              {attachments?.map((attachment) => (
                <div key={attachment.id} className="attachment-item">
                  <div className="attachment-icon">
                    {attachment.type === 'link' ? <Link2 size={16} /> : <File size={16} />}
                  </div>
                  <div className="attachment-info">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="attachment-name"
                    >
                      {attachment.name}
                      <ExternalLink size={10} style={{ marginLeft: '4px', opacity: 0.5 }} />
                    </a>
                    <div className="attachment-meta">
                      {attachment.type} • {new Date(attachment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    className="delete-attachment-btn"
                    onClick={() => deleteAttachment.mutate(attachment.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <AttachmentCreator onCreate={(data) => createAttachment.mutate(data)} />
          </div>

          {/* Checklists Section */}
          <div className="modal-section">
            <h4 className="section-title">&gt; Checklists</h4>
            {checklists?.map((checklist) => (
              <ChecklistComponent key={checklist.id} checklist={checklist} cardId={cardId} />
            ))}
            <ChecklistCreator onCreate={(title) => createChecklist.mutate(title)} />
          </div>
        </div>
      </div>
    </div>
  )
}

function LabelCreator({ boardId }: { boardId: string }) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#e74c3c')

  const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#34495e']

  const createLabel = useMutation({
    mutationFn: async () => {
      const { data, error } = await api.labels.post({ name, color, boardId })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', boardId] })
      setName('')
      setIsOpen(false)
    },
  })

  if (!isOpen) {
    return (
      <button className="add-label-btn" onClick={() => setIsOpen(true)}>
        + New Label
      </button>
    )
  }

  return (
    <div className="label-creator">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Label name"
        className="label-name-input"
      />
      <div className="color-picker">
        {colors.map((c) => (
          <button
            key={c}
            className={`color-option ${color === c ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>
      <div className="label-creator-actions">
        <button onClick={() => createLabel.mutate()} className="btn-save" disabled={!name}>
          Create
        </button>
        <button onClick={() => setIsOpen(false)} className="btn-cancel">
          Cancel
        </button>
      </div>
    </div>
  )
}

function AttachmentCreator({ onCreate }: { onCreate: (data: { type: string; url: string; name: string }) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')

  if (!isOpen) {
    return (
      <button className="add-attachment-btn" onClick={() => setIsOpen(true)}>
        + Add Link
      </button>
    )
  }

  const handleSubmit = () => {
    if (url) {
      // Simple name inference if empty
      const finalName = name || url.split('/').pop() || url
      onCreate({ type: 'link', url, name: finalName })
      setUrl('')
      setName('')
      setIsOpen(false)
    }
  }

  return (
    <div className="attachment-creator">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste link here..."
        className="attachment-input"
        autoFocus
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Link name (optional)"
        className="attachment-input"
      />
      <div className="checklist-creator-actions">
        <button
          onClick={handleSubmit}
          className="btn-save"
          disabled={!url}
        >
          Add
        </button>
        <button onClick={() => setIsOpen(false)} className="btn-cancel">
          Cancel
        </button>
      </div>
    </div>
  )
}

function ChecklistComponent({ checklist, cardId }: { checklist: Checklist; cardId: string }) {
  const queryClient = useQueryClient()
  const [newItemContent, setNewItemContent] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(checklist.title)
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editedItemContent, setEditedItemContent] = useState('')
  // Using boardId from props or context if needed, but invalidating 'checklists' for cardId is enough
  // and we also invalidate 'cards' for the board to update progress.
  // We can get boardId from query cache or pass it down, but let's just invalidate 'checklists' for now
  // and 'cards' if we can access the key.
  // Actually, in onSuccess of parent we invalidate 'cards', 'boardId'.
  // Here we only have cardId.
  // But wait, the previous code used Route.useParams() to get boardId.
  // I will keep that if possible, or pass boardId.
  // Since this component is inside CardModal, let's pass boardId to ChecklistComponent too?
  // Or just use the hook.
  
  // Note: boardId is needed to update the board view (checklist progress)
  // Let's use the hook again as it was there.
  
  // Items are now passed via checklist prop
  const items = checklist.items

  const addItem = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await api.checklists.items.post({
        content,
        checklistId: checklist.id,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards'] }) // Invalidate all cards queries to be safe
      setNewItemContent('')
      setIsAddingItem(false)
    },
  })

  const toggleItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await api.checklists.items({ id: itemId }).toggle.post({})
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const deleteItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await api.checklists.items({ id: itemId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const updateChecklist = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await api.checklists({ id: checklist.id }).patch({ title })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      setIsEditingTitle(false)
    },
  })

  const updateItem = useMutation({
    mutationFn: async ({ itemId, content }: { itemId: string; content: string }) => {
      const { data, error } = await api.checklists.items({ id: itemId }).patch({ content })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      setEditingItemId(null)
    },
  })

  const deleteChecklist = useMutation({
    mutationFn: async () => {
      const { error } = await api.checklists({ id: checklist.id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
  })

  const completedCount = items?.filter((i) => i.isCompleted).length || 0
  const totalCount = items?.length || 0
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="checklist">
      <div className="checklist-header">
        {isEditingTitle ? (
          <input
            type="text"
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
            className="checklist-title-edit"
            autoFocus
          />
        ) : (
          <span
            className="checklist-title"
            onClick={() => setIsEditingTitle(true)}
            style={{ cursor: 'pointer' }}
          >
            {checklist.title}
          </span>
        )}
        <span className="checklist-progress">{completedCount}/{totalCount}</span>
        <button
          className="delete-checklist-btn"
          onClick={() => deleteChecklist.mutate()}
          title="Delete checklist"
        >
          ×
        </button>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="checklist-items">
        {items?.map((item) => (
          <div
            key={item.id}
            className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}
          >
            <input
              type="checkbox"
              checked={item.isCompleted}
              onChange={() => toggleItem.mutate(item.id)}
              className="checklist-checkbox"
            />
            {editingItemId === item.id ? (
              <input
                type="text"
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
                className="checklist-item-edit"
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
            <button
              className="delete-item-btn"
              onClick={() => deleteItem.mutate(item.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      {isAddingItem ? (
        <div className="add-item-container">
          <input
            type="text"
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            placeholder="Type and press Enter..."
            className="add-item-input"
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
              if (!newItemContent) {
                setIsAddingItem(false)
              }
            }}
          />
        </div>
      ) : (
        <button className="add-item-trigger" onClick={() => setIsAddingItem(true)}>
          + Add Item
        </button>
      )}
    </div>
  )
}

function ChecklistCreator({ onCreate }: { onCreate: (title: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')

  if (!isOpen) {
    return (
      <button className="add-checklist-btn" onClick={() => setIsOpen(true)}>
        + Add Checklist
      </button>
    )
  }

  return (
    <div className="checklist-creator">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Checklist title"
        className="checklist-title-input"
      />
      <div className="checklist-creator-actions">
        <button
          onClick={() => {
            if (title) {
              onCreate(title)
              setTitle('')
              setIsOpen(false)
            }
          }}
          className="btn-save"
          disabled={!title}
        >
          Add
        </button>
        <button onClick={() => setIsOpen(false)} className="btn-cancel">
          Cancel
        </button>
      </div>
    </div>
  )
}
