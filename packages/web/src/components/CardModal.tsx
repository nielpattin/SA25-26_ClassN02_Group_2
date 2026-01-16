import { useState, useEffect, useRef } from 'react'
import { X, Calendar, Type, Paperclip, MessageSquare, History, Tag, Move, Trash2, MoreHorizontal, Archive, Flag, Image, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { Button } from './ui/Button'
import { Textarea } from './ui/Textarea'
import { Input } from './ui/Input'
import { Popover } from './ui/Popover'
import { DatePicker } from './ui/DatePicker'
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
  const mainDateTriggerRef = useRef<HTMLDivElement>(null)
  const priorityTriggerRef = useRef<HTMLButtonElement>(null)
  const assignedTriggerRef = useRef<HTMLButtonElement>(null)
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
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

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

  if (isLoading || !card) return <div className="h-screen flex items-center justify-center text-black font-heading font-extrabold uppercase bg-canvas">Loading...</div>

  const menuItems = [
    { label: 'Move', icon: <Move size={14} />, onClick: () => setIsMoving(true) },
    { label: 'Archive', icon: <Archive size={14} />, onClick: () => archiveCard.mutate() }
  ]

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-1000" onClick={onClose}>
      <div className="bg-white border border-black w-[95%] max-w-250 max-h-[90vh] flex flex-col relative shadow-brutal-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {card.coverImageUrl && (
          <div className="w-full h-50 relative overflow-hidden border-b border-black bg-[#EEEEEE] shrink-0">
            <img src={card.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            <button
              className="absolute top-3 right-3 bg-black text-white border border-white p-2 cursor-pointer flex items-center justify-center hover:bg-[#E74C3C]"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => updateCard.mutate({ coverImageUrl: null } as any)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-black h-16 shrink-0">
          <Input
            value={card.title}
            onChange={(e) => updateCard.mutate({ title: e.target.value })}
            className="h-full border-none font-heading text-[20px] font-extrabold uppercase p-0 bg-transparent"
            brutal={false}
          />
          <div className="flex items-center gap-2 pr-4">
            <Dropdown
              trigger={
                <button className="bg-white border border-black text-black cursor-pointer w-10 h-10 flex items-center justify-center transition-all hover:bg-accent hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm active:translate-x-0 active:translate-y-0 active:shadow-none">
                  <MoreHorizontal size={18} />
                </button>
              }
              items={menuItems}
            />
            <button
              className="bg-white border border-black text-black cursor-pointer w-10 h-10 flex items-center justify-center transition-all hover:bg-text-danger hover:text-white hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm active:translate-x-0 active:translate-y-0 active:shadow-none"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex flex-row min-h-0 flex-1 overflow-hidden bg-white">
          <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto border-r border-black min-w-0">
            {/* Metadata Grid */}
            <div className="border-2 border-black shadow-brutal-md bg-white overflow-hidden shrink-0 mb-4">
              <div className="grid grid-cols-2 border-b-2 border-black bg-accent">
                <div className="p-1 px-3 border-r-2 border-black font-heading text-[10px] font-extrabold uppercase tracking-widest text-black flex items-center gap-2">
                  <Tag size={12} strokeWidth={2.5} /> Labels
                </div>
                <div className="p-1 px-3 font-heading text-[10px] font-extrabold uppercase tracking-widest text-black flex items-center gap-2">
                  <Calendar size={12} strokeWidth={2.5} /> Due Date
                </div>
              </div>
              <div className="grid grid-cols-2 items-stretch">
                <div className="p-2.5 border-r-2 border-black bg-white flex flex-col justify-center min-w-0 overflow-hidden">
                  <LabelSection
                    cardLabels={card.labels || []}
                    allLabels={boardLabels || []}
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
                <div className="p-2.5 bg-white flex items-center justify-center min-w-0 overflow-hidden">
                  <div
                    className="h-12 px-4 bg-white border-2 border-black flex items-center justify-center cursor-pointer shadow-brutal-sm transition-all hover:shadow-brutal-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-none shrink-0"
                    onClick={() => setIsDatePickerOpen(prev => !prev)}
                    ref={mainDateTriggerRef}>
                    <div className="flex items-center gap-3">
                      {card.dueDate ? (
                        <>
                          <span className="font-body text-[14px] font-extrabold uppercase text-black">
                            {format(new Date(card.dueDate), 'MMM d, yyyy')}
                          </span>
                          {new Date(card.dueDate) < new Date() && (
                            <span className="bg-[#E74C3C] text-white text-[11px] font-extrabold px-2 py-0.5 uppercase border-2 border-black shadow-brutal-sm leading-none">Overdue</span>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-text-subtle">
                          <Plus size={16} strokeWidth={3} />
                          <span className="font-body text-[14px] font-extrabold uppercase">Set Date</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-3">
              <h3 className="m-0 font-heading text-[11px] font-extrabold uppercase tracking-widest text-black flex items-center gap-1.5 opacity-60"><Type size={14} /> Description</h3>
              {isEditingDescription ? (
                <div className="flex flex-col gap-3">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button onClick={() => {
                      updateCard.mutate({ description })
                      setIsEditingDescription(false)
                    }}>Save</Button>
                    <Button variant="secondary" onClick={() => setIsEditingDescription(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div
                  className="p-4 bg-[#F8F8F8] border border-black text-[14px] leading-relaxed text-[#333333] cursor-pointer min-h-25 wrap-break-word shadow-brutal-sm hover:bg-[#EEEEEE] hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
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
            <div className="flex flex-col gap-3">
              <h3 className="m-0 font-heading text-[11px] font-extrabold uppercase tracking-widest text-black flex items-center gap-1.5 opacity-60"><Paperclip size={14} /> Attachments</h3>
              <AttachmentSection
                attachments={[]}
                onAdd={() => { }}
                onDelete={() => { }}
              />
            </div>

            {/* Comments */}
            <div className="flex flex-col gap-3">
              <h3 className="m-0 font-heading text-[11px] font-extrabold uppercase tracking-widest text-black flex items-center gap-1.5 opacity-60"><MessageSquare size={14} /> Comments</h3>
              <CommentSection
                cardId={cardId}
                comments={comments}
                sessionUserId="current-user-id" // Replace with real session
              />
            </div>

            {/* Activity */}
            <div className="flex flex-col gap-3">
              <h3 className="m-0 font-heading text-[11px] font-extrabold uppercase tracking-widest text-black flex items-center gap-1.5 opacity-60"><History size={14} /> Activity</h3>
              <ActivitySection activities={activities} />
            </div>
          </div>

          <div className="w-[320px] shrink-0 p-8 bg-[#F4F4F4] overflow-y-auto flex flex-col gap-6 min-w-0">
            <div className="flex flex-col gap-3">
              <h3 className="m-0 font-heading text-[11px] font-extrabold uppercase tracking-widest text-black flex items-center gap-1.5 opacity-60">Add to card</h3>
              <div className="flex flex-col gap-2">
                <ChecklistCreator onCreate={(title) => createChecklist.mutate(title)} />

                <Popover
                  isOpen={isDatePickerOpen}
                  onClose={() => setIsDatePickerOpen(false)}
                  triggerRef={mainDateTriggerRef}
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
                  onClick={() => setIsPriorityOpen(prev => !prev)}
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
                  <div className="flex flex-col gap-1">
                    {PRIORITIES.map(p => (
                      <button
                        key={p.id}
                        className={`flex items-center gap-2.5 p-2 px-3 bg-white border border-black font-body text-[13px] font-bold cursor-pointer transition-all text-left ${card.priority === p.id ? 'bg-[#EEEEEE] shadow-inner-brutal' : 'hover:bg-[#F4F4F4] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md'}`}
                        onClick={() => {
                          updateCard.mutate({ priority: p.id as Card['priority'] })
                          setIsPriorityOpen(false)
                        }}
                      >
                        <span className="w-3 h-3 border border-black" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </button>
                    ))}
                  </div>
                </Popover>

                <Button
                  ref={coverTriggerRef}
                  variant="secondary"
                  fullWidth
                  onClick={() => setIsCoverOpen(prev => !prev)}
                >
                  <Image size={14} /> Cover
                </Button>

                <Popover
                  isOpen={isCoverOpen}
                  onClose={() => setIsCoverOpen(false)}
                  triggerRef={coverTriggerRef}
                  title="Card Cover"
                >
                  <div className="flex flex-col p-1 min-w-70">
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
                    <div className="mt-3 flex gap-2">
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

            {/* Assigned Members Section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="m-0 font-heading text-[11px] font-extrabold uppercase tracking-widest text-black flex items-center gap-1.5 opacity-60">Assigned</h3>
                <button 
                  ref={assignedTriggerRef}
                  className="w-7 h-7 bg-white border border-black flex items-center justify-center cursor-pointer hover:bg-accent hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-sm transition-all"
                  onClick={() => setIsMembersOpen(!isMembersOpen)}
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
              
              <Popover
                isOpen={isMembersOpen}
                onClose={() => setIsMembersOpen(false)}
                triggerRef={assignedTriggerRef}
                title="Members"
              >
                <AssigneeSection
                  variant="picker"
                  currentAssignees={card.assignees || []}
                  boardMembers={boardMembers}
                  onToggle={(userId) => toggleAssignee.mutate(userId)}
                />
              </Popover>

              <AssigneeSection
                variant="sidebar-list"
                currentAssignees={card.assignees || []}
                boardMembers={boardMembers}
                onToggle={(userId) => toggleAssignee.mutate(userId)}
              />
            </div>

            <div className="flex flex-col gap-4">
              <h3 className="m-0 font-heading text-[11px] font-extrabold uppercase tracking-widest text-black flex items-center gap-1.5 opacity-60">Details</h3>
              <div className="grid grid-cols-2 gap-4 p-4 bg-white border border-black shadow-brutal-sm transition-all hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-extrabold uppercase text-text-subtle">Position</span>
                  <span className="text-[13px] font-extrabold text-black">{card.position}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-extrabold uppercase text-text-subtle">Priority</span>
                  <span className="text-[13px] font-extrabold text-black" style={{
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
