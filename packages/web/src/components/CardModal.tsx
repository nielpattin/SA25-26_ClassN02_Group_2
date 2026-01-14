import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link2, File, Trash2, ExternalLink, X, ChevronRight, CheckSquare, Square, CalendarClock, AlertTriangle, MoreHorizontal } from 'lucide-react'
import { api } from '../api/client'
import { useSession } from '../api/auth'
import { Dropdown } from './Dropdown'
import './CardModal.css'

type Card = {
  id: string
  title: string
  description: string | null
  dueDate: string | Date | null
  priority: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null
  columnId: string
}

type Attachment = {
  id: string
  taskId: string
  type: 'link' | 'file'
  url: string
  name: string
  mimeType: string | null
  size: number | null
  createdAt: string | Date
}

type Comment = {
  id: string
  taskId: string
  userId: string
  content: string
  userName: string | null
  userImage: string | null
  createdAt: string | Date
  updatedAt: string | Date
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
  position: string
}

type Checklist = {
  id: string
  title: string
  taskId: string
  position: string
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
  const [priority, setPriority] = useState<'urgent' | 'high' | 'medium' | 'low' | 'none' | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [deletingLabel, setDeletingLabel] = useState<Label | null>(null)
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null)
  const isMouseDownOnOverlay = useRef(false)

  // Fetch card data
  const { data: card, isLoading: cardLoading } = useQuery({
    queryKey: ['card', cardId],
    queryFn: async () => {
      const { data, error } = await api.tasks({ id: cardId }).get()
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
      const { data, error } = await api.checklists.task({ taskId: cardId }).get()
      if (error) throw error
      return data as Checklist[]
    },
  })

  // Attachments
  const { data: attachments } = useQuery({
    queryKey: ['attachments', cardId],
    queryFn: async () => {
      const { data, error } = await api.attachments.task({ taskId: cardId }).get()
      if (error) throw error
      return data as Attachment[]
    },
  })

  // Comments
  const { data: session } = useSession()

  const { data: comments } = useQuery({
    queryKey: ['comments', cardId],
    queryFn: async () => {
      const { data, error } = await api.comments.task({ taskId: cardId }).get()
      if (error) throw error
      return data as Comment[]
    },
  })

  // Mutations
  const updateCard = useMutation({
    mutationFn: async (updates: { title?: string; description?: string; dueDate?: string | null; priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null }) => {
      const { data, error } = await api.tasks({ id: cardId }).patch(updates)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
    },
  })

  const archiveCard = useMutation({
    mutationFn: async () => {
      const { error } = await api.tasks({ id: cardId }).archive.post({})
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      onClose()
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

  const deleteLabel = useMutation({
    mutationFn: async (labelId: string) => {
      const { error } = await api.labels({ id: labelId }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cardLabels'] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    },
  })

  const createChecklist = useMutation({
    mutationFn: async (checklistTitle: string) => {
      const { data, error } = await api.checklists.post({
        title: checklistTitle,
        taskId: cardId,
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
    mutationFn: async (data: { type: 'link' | 'file'; url: string; name: string }) => {
      const { data: result, error } = await api.attachments.post({
        ...data,
        taskId: cardId,
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

  const createComment = useMutation({
    mutationFn: async (content: string) => {
      const { data, error } = await api.comments.post({ taskId: cardId, content })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] })
    },
  })

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.comments({ id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] })
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
    setPriority(card.priority)
    setIsInitialized(true)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDownOnOverlay.current = e.target === e.currentTarget
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isMouseDownOnOverlay.current && e.target === e.currentTarget) {
      onClose()
    }
    isMouseDownOnOverlay.current = false
  }

  const handleSave = () => {
    updateCard.mutate({
      title,
      description,
      dueDate: dueDate || null,
    })
  }

  if (cardLoading || !card) {
    return (
      <div className="modal-overlay" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
        <div className="modal-content" onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
          <div className="loading-state">// Loading card...</div>
        </div>
      </div>
    )
  }

  const now = new Date()
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const isOverdue = dueDate && new Date(dueDate) < now
  const isDueSoon = dueDate && !isOverdue && new Date(dueDate) <= twoDaysFromNow

  return (
    <div className="modal-overlay" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp}>
      <div className="modal-content" onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
        <div className="modal-header">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="modal-title-input"
            onBlur={handleSave}
            onFocus={(e) => {
              const val = e.target.value
              e.target.value = ''
              e.target.value = val
            }}
          />
          <div className="modal-actions-header">
            <Dropdown
              trigger={
                <button className="modal-header-btn" title="More actions">
                  <MoreHorizontal size={20} />
                </button>
              }
              items={[
                {
                  label: 'Archive Task',
                  icon: <Trash2 size={16} />,
                  variant: 'danger',
                  onClick: () => setShowArchiveConfirm(true),
                },
              ]}
            />
            <button onClick={onClose} className="modal-header-btn close" title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-main-content">
            {/* Labels Section */}
            <div className="modal-section">
              <h4 className="section-title"><ChevronRight size={14} /> Labels</h4>
              <div className="labels-container">
                {boardLabels?.map((label) => {
                  const isAttached = cardLabels?.some((cl) => cl.id === label.id)
                  return (
                    <div key={label.id} className="label-wrapper">
                      <button
                        className={`label-pill ${isAttached ? 'active' : ''}`}
                        style={{ '--label-color': label.color } as React.CSSProperties}
                        onClick={() => toggleLabel.mutate({ labelId: label.id, attached: !!isAttached })}
                      >
                        {label.name}
                      </button>
                      <button 
                        className="delete-label-pill-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeletingLabel(label)
                        }}
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )
                })}
                <LabelCreator boardId={boardId} />
              </div>
            </div>

            {/* Priority Section */}
            <div className="modal-section">
              <h4 className="section-title"><ChevronRight size={14} /> Priority</h4>
              <div className="priority-container">
                {(['urgent', 'high', 'medium', 'low', 'none'] as const).map((p) => (
                  <button
                    key={p}
                    className={`priority-pill ${priority === p ? 'active' : ''} ${p}`}
                    onClick={() => {
                      setPriority(p)
                      updateCard.mutate({ priority: p })
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due Date Section */}
            <div className="modal-section">
              <h4 className="section-title"><ChevronRight size={14} /> Due Date</h4>
              <div className="brutal-date-widget">
                <div className="widget-segment icon-segment">
                  <CalendarClock size={16} />
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value)
                    updateCard.mutate({ dueDate: e.target.value || null })
                  }}
                  className="widget-input"
                />
                
                {isOverdue && (
                  <div className="widget-segment status-segment overdue">
                    <AlertTriangle size={12} />
                    OVERDUE
                  </div>
                )}
                {isDueSoon && (
                  <div className="widget-segment status-segment soon">
                    <CalendarClock size={12} />
                    SOON
                  </div>
                )}

                {dueDate && (
                  <button
                    className="widget-segment clear-segment"
                    onClick={() => {
                      setDueDate('')
                      updateCard.mutate({ dueDate: null })
                    }}
                    title="Clear date"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Description Section */}
            <div className="modal-section">
              <h4 className="section-title"><ChevronRight size={14} /> Description</h4>
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
              <h4 className="section-title"><ChevronRight size={14} /> Attachments</h4>
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
              <h4 className="section-title"><ChevronRight size={14} /> Checklists</h4>
              {checklists?.map((checklist) => (
                <ChecklistComponent key={checklist.id} checklist={checklist} cardId={cardId} />
              ))}
              <ChecklistCreator onCreate={(title) => createChecklist.mutate(title)} />
            </div>
          </div>

          <div className="modal-sidebar">
            {/* Comments Section */}
            <div className="modal-section">
              <h4 className="section-title"><ChevronRight size={14} /> Comments</h4>
              <div className="comments-list">
                {comments?.map((comment) => (
                  <div key={comment.id} className="comment-item">
                    <div className="comment-avatar">
                      {comment.userName?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="comment-content-container">
                      <div className="comment-author-info">
                        <div className="comment-author-meta">
                          <span className="comment-author-name">{comment.userName}</span>
                          <span className="comment-date">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {session?.user.id === comment.userId && (
                          <button
                            className="comment-delete-btn"
                            onClick={() => setDeletingCommentId(comment.id)}
                            title="Delete comment"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <div className="comment-content">{comment.content}</div>
                    </div>
                  </div>
                ))}
              </div>
              <CommentCreator onCreate={(content) => createComment.mutate(content)} />
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showArchiveConfirm}
        title="Archive Task"
        message="Are you sure you want to archive this task? It will be removed from the board but can be restored later."
        confirmText="Archive"
        variant="danger"
        onConfirm={() => archiveCard.mutate()}
        onCancel={() => setShowArchiveConfirm(false)}
      />

      <ConfirmModal
        isOpen={!!deletingLabel}
        title="Delete Label"
        message={`Are you sure you want to delete label "${deletingLabel?.name}" from the board? This will remove it from all tasks.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={() => {
          if (deletingLabel) {
            deleteLabel.mutate(deletingLabel.id)
            setDeletingLabel(null)
          }
        }}
        onCancel={() => setDeletingLabel(null)}
      />

      <ConfirmModal
        isOpen={!!deletingCommentId}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
        onConfirm={() => {
          if (deletingCommentId) {
            deleteComment.mutate(deletingCommentId)
            setDeletingCommentId(null)
          }
        }}
        onCancel={() => setDeletingCommentId(null)}
      />
    </div>
  )
}

function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  variant = 'default' 
}: {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
}) {
  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay confirm-overlay" onClick={onCancel}>
      <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="confirm-title">{title}</h3>
          <button onClick={onCancel} className="modal-header-btn close"><X size={20} /></button>
        </div>
        <div className="modal-body confirm-body">
          <p className="confirm-message">{message}</p>
          <div className="confirm-actions">
            <button onClick={onCancel} className="btn-cancel">{cancelText}</button>
            <button 
              onClick={onConfirm} 
              className={`btn-save ${variant === 'danger' ? 'danger' : ''}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function CommentCreator({ onCreate }: { onCreate: (content: string) => void }) {
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    if (content.trim()) {
      onCreate(content.trim())
      setContent('')
    }
  }

  return (
    <div className="comment-creator">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write a comment..."
        className="comment-input"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmit()
          }
        }}
      />
      <div className="comment-creator-actions">
        <button
          onClick={handleSubmit}
          className="btn-save"
          disabled={!content.trim()}
        >
          Comment
        </button>
      </div>
    </div>
  )
}

function LabelCreator({ boardId }: { boardId: string }) {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#e74c3c')

  const colors = ['#FFA07A', '#E74C3C', '#F7DC6F', '#BB8FCE', '#3498db', '#2ecc71', '#000000', '#FF69B4']

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

function AttachmentCreator({ onCreate }: { onCreate: (data: { type: 'link' | 'file'; url: string; name: string }) => void }) {
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
      queryClient.invalidateQueries({ queryKey: ['cards'] })
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

  const completedCount = items?.filter((i: ChecklistItem) => i.isCompleted).length || 0
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
              <X size={14} />
            </button>
          </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="checklist-items">
        {items?.map((item: ChecklistItem) => (
          <div
            key={item.id}
            className={`checklist-item ${item.isCompleted ? 'completed' : ''}`}
          >
            <button 
              className={`checklist-checkbox-btn ${item.isCompleted ? 'completed' : ''}`}
              onClick={() => toggleItem.mutate(item.id)}
            >
              {item.isCompleted ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
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
              <X size={14} />
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
