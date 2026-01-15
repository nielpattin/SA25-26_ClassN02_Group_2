import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Type, Paperclip, MessageSquare, History, Tag, UserPlus, Move, Trash2, MoreHorizontal, Archive, Flag, Image, Users } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Button } from './ui/Button'
import { Textarea } from './ui/Textarea'
import { Input } from './ui/Input'
import { Popover } from './ui/Popover'
import { DatePicker } from './ui/DatePicker'
import { Checkbox } from './ui/Checkbox'
import { Dropdown } from './Dropdown'
import { Checklist, ChecklistCreator } from './checklist'
import { CommentSection } from './comments'
import { LabelSection } from './Labels'
import { AssigneeSection } from './Assignees'
import { AttachmentSection } from './Attachments'
import { ActivitySection } from './Activity'
import { MoveModal } from './MoveModal'
import { Card, Checklist as ChecklistType, Comment, Activity, Board } from './CardModalTypes'
import { format } from 'date-fns'
import './CardModal.css'

interface CardModalProps {
  cardId: string
  boardId: string
  onClose: () => void
}

const PRIORITIES = [
  { id: 'urgent', name: 'Urgent', color: '#E74C3C' },
  { id: 'high', name: 'High', color: '#E67E22' },
  { id: 'medium', name: 'Medium', color: '#F1C40F' },
  { id: 'low', name: 'Low', color: '#2ECC71' },
  { id: 'none', name: 'None', color: '#95A5A6' },
]

export function CardModal({ cardId, boardId, onClose }: CardModalProps) {
  const queryClient = useQueryClient()
  const [isMoving, setIsMoving] = useState(false)
  const [description, setDescription] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isPriorityOpen, setIsPriorityOpen] = useState(false)
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const [isCoverOpen, setIsCoverOpen] = useState(false)
  const dateTriggerRef = useRef<HTMLButtonElement>(null)
  const mainDateTriggerRef = useRef<HTMLDivElement>(null)
  const priorityTriggerRef = useRef<HTMLButtonElement>(null)
  const membersTriggerRef = useRef<HTMLButtonElement>(null)
  const coverTriggerRef = useRef<HTMLButtonElement>(null)
  const [coverUrl, setCoverUrl] = useState('')

  const { data: card, isLoading } = useQuery<Card>({
    queryKey: ['card', cardId],
    queryFn: async () => {
      const { data, error } = await api.tasks({ id: cardId }).get()
      if (error) throw error
      return data as unknown as Card
    }
  })

  const { data: checklists = [] } = useQuery<ChecklistType[]>({
    queryKey: ['checklists', cardId],
    queryFn: async () => {
      const { data, error } = await api.checklists.task({ taskId: cardId }).get()
      if (error) throw error
      return data as unknown as ChecklistType[]
    },
    enabled: !!card
  })

  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['comments', cardId],
    queryFn: async () => {
      const { data, error } = await api.comments.task({ taskId: cardId }).get()
      if (error) throw error
      return data as unknown as Comment[]
    },
    enabled: !!card
  })

  const { data: activities = [] } = useQuery<Activity[]>({
    queryKey: ['activities', cardId],
    queryFn: async () => {
      const { data, error } = await api.activities.task({ taskId: cardId }).get()
      if (error) throw error
      return data as unknown as Activity[]
    },
    enabled: !!card
  })

  const { data: boardLabels = [] } = useQuery<{ id: string; name: string; color: string }[]>({
    queryKey: ['labels', boardId],
    queryFn: async () => {
      const { data, error } = await api.labels.board({ boardId }).get()
      if (error) throw error
      return data as unknown as { id: string; name: string; color: string }[]
    }
  })

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await api.boards.get()
      if (error) throw error
      return data as unknown as Board[]
    }
  })

  const { data: boardMembers = [] } = useQuery<{ id: string; name: string | null; image: string | null }[]>({
    queryKey: ['board-members', boardId],
    queryFn: async () => {
      const { data, error } = await api.boards({ id: boardId }).members.get()
      if (error) throw error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (data as any[]).map((m: any) => ({
        id: m.userId,
        name: m.userName,
        image: m.userImage
      }))
    }
  })

  useEffect(() => {
    if (card?.description) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDescription(card.description)
    }
    if (card?.coverImageUrl) {
      setCoverUrl(card.coverImageUrl)
    }
  }, [card?.description, card?.coverImageUrl])

  const updateCard = useMutation({
    mutationFn: async (updates: Partial<Card>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await api.tasks({ id: cardId }).patch(updates as any)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    }
  })

  const archiveCard = useMutation({
    mutationFn: async () => {
      const { error } = await api.tasks({ id: cardId }).archive.post()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      onClose()
    }
  })

  const moveCard = useMutation({
    mutationFn: async (params: { columnId: string, beforeTaskId?: string, afterTaskId?: string }) => {
      const { error } = await api.tasks({ id: cardId }).move.patch(params)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setIsMoving(false)
    }
  })

  const toggleAssignee = useMutation({
    mutationFn: async (userId: string) => {
      const currentAssignees = card!.assignees || []
      if (currentAssignees.includes(userId)) {
        await api.tasks({ id: cardId }).assignees({ userId }).delete()
      } else {
        await api.tasks({ id: cardId }).assignees.post({ userId })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['activities', cardId] })
    }
  })

  const createChecklist = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await api.checklists.post({
        title,
        taskId: cardId
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklists', cardId] })
      queryClient.invalidateQueries({ queryKey: ['card', cardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    }
  })

  if (isLoading || !card) return <div className="loading-state">Loading...</div>

  const menuItems = [
    { label: 'Move', icon: <Move size={14} />, onClick: () => setIsMoving(true) },
    { label: 'Archive', icon: <Archive size={14} />, onClick: () => archiveCard.mutate() }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {card.coverImageUrl && (
          <div className="modal-cover">
            <img src={card.coverImageUrl} alt="Cover" className="cover-image" />
            <button
              className="modal-cover-remove-btn"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => updateCard.mutate({ coverImageUrl: null } as any)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        <div className="modal-header">
          <Input
            value={card.title}
            onChange={(e) => updateCard.mutate({ title: e.target.value })}
            className="modal-title-input"
            brutal={false}
          />
          <div className="modal-actions-header">
            <Dropdown
              trigger={<button className="modal-header-btn"><MoreHorizontal size={20} /></button>}
              items={menuItems}
            />
            <button className="modal-header-btn close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="modal-main-content">
            {/* Labels & Members */}
            <div className="modal-top-meta">
              <div className="modal-section">
                <h3 className="section-title"><Tag size={14} /> Labels</h3>
                <LabelSection
                  cardLabels={card.labels}
                  allLabels={boardLabels}
                  onToggle={async (labelId) => {
                    const currentLabels = card.labels || []
                    if (currentLabels.includes(labelId)) {
                      await api.labels.card({ cardId }).label({ labelId }).delete()
                    } else {
                      await api.labels.card({ cardId }).label({ labelId }).post()
                    }
                    queryClient.invalidateQueries({ queryKey: ['card', cardId] })
                    queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
                  }}
                  onAdd={async (name, color) => {
                    await api.labels.post({ name, color, boardId })
                    queryClient.invalidateQueries({ queryKey: ['labels', boardId] })
                  }}
                  onDelete={async (labelId) => {
                    await api.labels({ id: labelId }).delete()
                    queryClient.invalidateQueries({ queryKey: ['labels', boardId] })
                    queryClient.invalidateQueries({ queryKey: ['card', cardId] })
                    queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
                  }}
                />
              </div>

              <div className="modal-section">
                <h3 className="section-title"><Users size={14} /> Members</h3>
                <AssigneeSection
                  currentAssignees={card.assignees || []}
                  boardMembers={boardMembers}
                  onToggle={(userId) => {
                    if (userId === 'open-picker') {
                      setIsMembersOpen(true)
                    } else {
                      toggleAssignee.mutate(userId)
                    }
                  }}
                />
              </div>
            </div>

            {/* Due Date */}
            {card.dueDate && (
              <div className="modal-section">
                <h3 className="section-title"><Calendar size={14} /> Due Date</h3>
                <div className="due-date-display">
                  <Checkbox
                    checked={false}
                    onChange={() => { }}
                    className="due-date-checkbox"
                  />
                  <div
                    className="due-date-info"
                    onClick={() => setIsDatePickerOpen(true)}
                    ref={mainDateTriggerRef}
                  >
                    <span className="date-text">
                      {format(new Date(card.dueDate), 'PPP')}
                    </span>
                    {new Date(card.dueDate) < new Date() && (
                      <span className="overdue-badge">Overdue</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Description */}
            <div className="modal-section">
              <h3 className="section-title"><Type size={14} /> Description</h3>
              {isEditingDescription ? (
                <div className="description-editor">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    autoFocus
                  />
                  <div className="description-actions">
                    <Button onClick={() => {
                      updateCard.mutate({ description })
                      setIsEditingDescription(false)
                    }}>Save</Button>
                    <Button variant="secondary" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div
                  className="description-display"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {card.description || 'Add a more detailed description...'}
                </div>
              )}
            </div>

            {/* Checklists */}
            {checklists.map(checklist => (
              <Checklist
                key={checklist.id}
                checklist={checklist}
                cardId={cardId}
              />
            ))}

            {/* Attachments */}
            <div className="modal-section">
              <h3 className="section-title"><Paperclip size={14} /> Attachments</h3>
              <AttachmentSection
                attachments={[]}
                onAdd={() => { }}
                onDelete={() => { }}
              />
            </div>

            {/* Comments */}
            <div className="modal-section">
              <h3 className="section-title"><MessageSquare size={14} /> Comments</h3>
              <CommentSection
                cardId={cardId}
                comments={comments}
                sessionUserId="current-user-id" // Replace with real session
              />
            </div>

            {/* Activity */}
            <div className="modal-section">
              <h3 className="section-title"><History size={14} /> Activity</h3>
              <ActivitySection activities={activities} />
            </div>
          </div>

          <div className="modal-sidebar">
            <div className="modal-section">
              <h3 className="section-title">Add to card</h3>
              <div className="sidebar-buttons">
                <ChecklistCreator onCreate={(title) => createChecklist.mutate(title)} />
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsMembersOpen(true)}
                  ref={membersTriggerRef}
                >
                  <UserPlus size={14} /> Members
                </Button>

                <Popover
                  isOpen={isMembersOpen}
                  onClose={() => setIsMembersOpen(false)}
                  triggerRef={membersTriggerRef}
                  title="Members"
                >
                  <AssigneeSection
                    variant="picker"
                    currentAssignees={card.assignees || []}
                    boardMembers={boardMembers}
                    onToggle={(userId) => toggleAssignee.mutate(userId)}
                  />
                </Popover>

                {!card.dueDate && (
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => setIsDatePickerOpen(true)}
                    ref={dateTriggerRef}
                  >
                    <Calendar size={14} /> Dates
                  </Button>
                )}

                <Popover
                  isOpen={isDatePickerOpen}
                  onClose={() => setIsDatePickerOpen(false)}
                  triggerRef={card.dueDate ? mainDateTriggerRef : dateTriggerRef}
                  title="Dates"
                >
                  <DatePicker
                    initialDate={card.dueDate}
                    onSave={(date) => {
                      updateCard.mutate({ dueDate: date })
                      setIsDatePickerOpen(false)
                    }}
                  />
                </Popover>

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsPriorityOpen(true)}
                  ref={priorityTriggerRef}
                >
                  <Flag size={14} /> Priority
                </Button>
                <Popover
                  isOpen={isPriorityOpen}
                  onClose={() => setIsPriorityOpen(false)}
                  triggerRef={priorityTriggerRef}
                  title="Priority"
                >
                  <div className="priority-picker">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.id}
                        className={`priority-option ${card.priority === p.id ? 'active' : ''}`}
                        onClick={() => {
                          updateCard.mutate({ priority: p.id as Card['priority'] })
                          setIsPriorityOpen(false)
                        }}
                      >
                        <span className="priority-dot" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </Popover>

                <Button
                  ref={coverTriggerRef}
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsCoverOpen(true)}
                >
                  <Image size={14} /> Cover
                </Button>

                <Popover
                  isOpen={isCoverOpen}
                  onClose={() => setIsCoverOpen(false)}
                  triggerRef={coverTriggerRef}
                  title="Card Cover"
                >
                  <div className="cover-picker">
                    <Input
                      placeholder="Enter image URL..."
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateCard.mutate({ coverImageUrl: coverUrl })
                          setIsCoverOpen(false)
                        }
                      }}
                      autoFocus
                    />
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <Button
                        fullWidth
                        onClick={() => {
                          updateCard.mutate({ coverImageUrl: coverUrl })
                          setIsCoverOpen(false)
                        }}
                      >
                        Save
                      </Button>
                      {card.coverImageUrl && (
                        <Button
                          variant="danger"
                          onClick={() => {
                            updateCard.mutate({ coverImageUrl: null })
                            setCoverUrl('')
                            setIsCoverOpen(false)
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </Popover>
              </div>
            </div>

            <div className="modal-section">
              <h3 className="section-title">Details</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Position</span>
                  <span className="detail-value">{card.position}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Priority</span>
                  <span className="detail-value" style={{
                    color: PRIORITIES.find(p => p.id === card.priority)?.color || 'inherit'
                  }}>
                    {card.priority || 'none'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMoving && (
        <MoveModal
          boards={boards}
          currentBoardId={boardId}
          currentColumnId={card.columnId}
          cardId={cardId}
          onMove={(columnId, beforeTaskId, afterTaskId) => moveCard.mutate({ columnId, beforeTaskId, afterTaskId })}
          onCancel={() => setIsMoving(false)}
        />
      )}
    </div>
  )
}
