import { useState, useEffect, useRef } from 'react'
import {
  X,
  Calendar,
  Type,
  Paperclip,
  MessageSquare,
  Bell,
  Tag,
  Move,
  MoreHorizontal,
  Archive,
  Flag,
  Image,
  Plus,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Input } from '../ui/Input'
import { Popover } from '../ui/Popover'
import { DatePicker } from '../ui/DatePicker'
import { Dropdown } from '../ui/Dropdown'
import { ChecklistCreator } from '../checklist'
import { CommentSection } from '../comments'
import { AttachmentSection } from '../attachments/Attachments'
import { MoveModal } from './MoveModal'
import { TaskChecklist } from './TaskChecklist'
import { TaskLabels } from './TaskLabels'
import { TaskAssignees } from './TaskAssignees'
import { TaskActivity } from './TaskActivity'
import { ReminderSelect } from './ReminderSelect'
import { format } from 'date-fns'
import { useSession } from '../../api/auth'
import {
  useAttachments,
  useAddLinkAttachment,
  useUploadAttachment,
  useDeleteAttachment,
  useDownloadAttachment,
  useCreateChecklist,
} from '../../hooks'
import type { UploadProgress, UploadError } from '../../hooks'

// Re-export types that were in CardModalTypes for backwards compatibility
export type { Card, Checklist as ChecklistType, Comment, Activity, Board, BoardMember } from '../CardModalTypes'
import type { Card, Board, BoardMember } from '../CardModalTypes'

export interface TaskModalProps {
  taskId?: string
  cardId?: string // Backwards compatibility alias for taskId
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

export function TaskModal({ taskId: taskIdProp, cardId, boardId, onClose }: TaskModalProps) {
  const taskId = taskIdProp ?? cardId ?? ''
  const queryClient = useQueryClient()
  const [isMoving, setIsMoving] = useState(false)
  const [description, setDescription] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false)
  const [isPriorityOpen, setIsPriorityOpen] = useState(false)
  const [isCoverOpen, setIsCoverOpen] = useState(false)
  const startDateTriggerRef = useRef<HTMLButtonElement>(null)
  const dueDateTriggerRef = useRef<HTMLButtonElement>(null)
  const priorityTriggerRef = useRef<HTMLButtonElement>(null)
  const coverTriggerRef = useRef<HTMLButtonElement>(null)
  const [coverUrl, setCoverUrl] = useState('')
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [uploadError, setUploadError] = useState<UploadError | null>(null)

  const { data: session } = useSession()

  const { data: attachments = [] } = useAttachments(taskId)
  const addLinkMutation = useAddLinkAttachment(taskId)
  const uploadMutation = useUploadAttachment(taskId)
  const deleteMutation = useDeleteAttachment(taskId)
  const downloadMutation = useDownloadAttachment()

  const { data: card, isLoading } = useQuery<Card>({
    queryKey: ['card', taskId],
    queryFn: async () => {
      const { data, error } = await api.v1.tasks({ id: taskId }).get()
      if (error) throw error
      return data as unknown as Card
    },
  })

  const { data: boards = [] } = useQuery<Board[]>({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await api.v1.boards.get()
      if (error) throw error
      return data as unknown as Board[]
    },
  })

  const { data: boardMembers = [] } = useQuery<BoardMember[]>({
    queryKey: ['board-members', boardId],
    queryFn: async () => {
      const { data, error } = await api.v1.boards({ id: boardId }).members.get()
      if (error) throw error
      return data as unknown as BoardMember[]
    },
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
      const { data, error } = await api.v1.tasks({ id: taskId }).patch(updates as any)
      if (error) throw error
      return data
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['card', taskId] })
      const previousCard = queryClient.getQueryData(['card', taskId])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(['card', taskId], (old: any) => ({ ...old, ...updates }))
      return { previousCard }
    },
    onError: (_err, _updates, context) => {
      queryClient.setQueryData(['card', taskId], context?.previousCard)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['card', taskId] })
    },
  })

  const archiveCard = useMutation({
    mutationFn: async () => {
      const { error } = await api.v1.tasks({ id: taskId }).archive.post()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      onClose()
    },
  })

  const moveCard = useMutation({
    mutationFn: async (params: { columnId: string; beforeTaskId?: string; afterTaskId?: string }) => {
      const { error } = await api.v1.tasks({ id: taskId }).move.patch(params)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setIsMoving(false)
    },
  })

  const createChecklist = useCreateChecklist(taskId, boardId)

  if (isLoading || !card)
    return (
      <div className="font-heading bg-canvas flex h-screen items-center justify-center font-extrabold text-black uppercase">
        Loading...
      </div>
    )

  const menuItems = [
    { label: 'Move', icon: <Move size={14} />, onClick: () => setIsMoving(true) },
    { label: 'Archive', icon: <Archive size={14} />, onClick: () => archiveCard.mutate() },
  ]

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="shadow-brutal-xl relative flex max-h-[90vh] w-[95%] max-w-250 flex-col overflow-hidden border border-black bg-white"
        onClick={e => e.stopPropagation()}
      >
        {card.coverImageUrl && (
          <div className="bg-active relative h-50 w-full shrink-0 overflow-hidden border-b border-black">
            <img src={card.coverImageUrl} alt="Cover" className="h-full w-full object-cover" />
            <button
              className="absolute top-3 right-3 flex cursor-pointer items-center justify-center border border-white bg-black p-2 text-white hover:bg-[#E74C3C]"
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => updateCard.mutate({ coverImageUrl: null } as any)}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex h-16 shrink-0 items-center justify-between border-b border-black">
          <Input
            value={card.title}
            onChange={e => updateCard.mutate({ title: e.target.value })}
            className="font-heading h-full border-none bg-transparent p-0 text-[20px] font-extrabold uppercase"
            brutal={false}
          />
          <div className="flex items-center gap-2 pr-4">
            <Dropdown
              trigger={
                <button className="hover:bg-accent hover:shadow-brutal-sm flex h-10 w-10 cursor-pointer items-center justify-center border border-black bg-white text-black transition-all hover:-translate-0.5 active:translate-0 active:shadow-none">
                  <MoreHorizontal size={18} />
                </button>
              }
              items={menuItems}
            />
            <button
              className="hover:bg-text-danger hover:shadow-brutal-sm flex h-10 w-10 cursor-pointer items-center justify-center border border-black bg-white text-black transition-all hover:-translate-0.5 hover:text-white active:translate-0 active:shadow-none"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-row overflow-hidden bg-white">
          <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto border-r border-black p-8">
            {/* Labels Section */}
            <div className="shadow-brutal-md mb-4 shrink-0 overflow-hidden border-2 border-black bg-white">
              <div className="bg-accent flex items-center gap-2 border-b-2 border-black p-1 px-3">
                <Tag size={12} strokeWidth={2.5} />
                <span className="font-heading text-[10px] font-extrabold tracking-widest text-black uppercase">
                  Labels
                </span>
              </div>
              <div className="bg-white p-2.5">
                <TaskLabels taskId={taskId} boardId={boardId} cardLabels={card.labels || []} />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-3">
              <h3 className="font-heading m-0 flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
                <Type size={14} /> Description
              </h3>
              {isEditingDescription ? (
                <div className="flex flex-col gap-3">
                  <Textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        updateCard.mutate({ description })
                        setIsEditingDescription(false)
                      }}
                    >
                      Save
                    </Button>
                    <Button variant="secondary" onClick={() => setIsEditingDescription(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="shadow-brutal-sm hover:shadow-brutal-md bg-surface-overlay hover:bg-active min-h-25 cursor-pointer border border-black p-4 text-[14px] leading-relaxed wrap-break-word text-[#333333] transition-all hover:-translate-0.5"
                  onClick={() => setIsEditingDescription(true)}
                >
                  {card.description || 'Add a more detailed description...'}
                </div>
              )}
            </div>

            {/* Checklists */}
            <TaskChecklist taskId={taskId} boardId={boardId} />

            {/* Attachments */}
            <div className="flex flex-col gap-3">
              <h3 className="font-heading m-0 flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
                <Paperclip size={14} /> Attachments
              </h3>
              <AttachmentSection
                attachments={attachments}
                onAddLink={(name, url) => addLinkMutation.mutate({ name, url })}
                onDelete={(id) => deleteMutation.mutate(id)}
                onUpload={async (file) => {
                  setUploadError(null)
                  try {
                    await uploadMutation.mutateAsync({ file, onProgress: setUploadProgress })
                    setUploadProgress(null)
                  } catch (err) {
                    setUploadProgress(null)
                    setUploadError(err as UploadError)
                  }
                }}
                onDownload={async (id) => {
                  const result = await downloadMutation.mutateAsync(id)
                  window.open(result.url, '_blank', 'noopener,noreferrer')
                }}
                isUploading={uploadMutation.isPending}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
                onClearError={() => setUploadError(null)}
              />
            </div>

            {/* Comments */}
            <div className="flex flex-col gap-3">
              <h3 className="font-heading m-0 flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
                <MessageSquare size={14} /> Comments
              </h3>
              <CommentSection
                cardId={taskId}
                members={boardMembers}
                sessionUserId={session?.user?.id}
              />
            </div>

            {/* Activity */}
            <TaskActivity taskId={taskId} />
          </div>

          <div className="bg-hover flex w-[320px] min-w-0 shrink-0 flex-col gap-6 overflow-y-auto p-8">
            {/* Dates Section */}
            <div className="flex flex-col gap-3">
              <h3 className="font-heading m-0 flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
                <Calendar size={14} /> Dates
              </h3>
              <div className="flex flex-col gap-2">
                {/* Start Date */}
                <button
                  ref={startDateTriggerRef}
                  className="shadow-brutal-sm hover:shadow-brutal-md flex cursor-pointer items-center justify-between border border-black bg-white p-3 text-left transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                  onClick={() => setIsStartDatePickerOpen(prev => !prev)}
                >
                  <span className="text-text-subtle text-[11px] font-bold uppercase">Start</span>
                  <span className="font-body text-[13px] font-bold text-black">
                    {card.startDate ? (
                      format(new Date(card.startDate), 'MMM d, yyyy')
                    ) : (
                      <span className="text-text-subtle">+ Add</span>
                    )}
                  </span>
                </button>

                {/* Due Date */}
                <button
                  ref={dueDateTriggerRef}
                  className="shadow-brutal-sm hover:shadow-brutal-md flex cursor-pointer items-center justify-between border border-black bg-white p-3 text-left transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-none"
                  onClick={() => setIsDatePickerOpen(prev => !prev)}
                >
                  <span className="text-text-subtle text-[11px] font-bold uppercase">Due</span>
                  <div className="flex items-center gap-2">
                    <span className="font-body text-[13px] font-bold text-black">
                      {card.dueDate ? (
                        format(new Date(card.dueDate), 'MMM d, yyyy')
                      ) : (
                        <span className="text-text-subtle">+ Add</span>
                      )}
                    </span>
                    {card.dueDate && new Date(card.dueDate) < new Date() && (
                      <span className="shadow-brutal-sm border border-black bg-[#E74C3C] px-1.5 py-0.5 text-[9px] font-extrabold text-white uppercase">
                        Overdue
                      </span>
                    )}
                  </div>
                </button>

                {/* Reminder */}
                <div className="shadow-brutal-sm flex items-center justify-between border border-black bg-white p-3">
                  <span className="text-text-subtle text-[11px] font-bold uppercase">Reminder</span>
                  <ReminderSelect
                    value={card.reminder}
                    onChange={reminder => updateCard.mutate({ reminder })}
                    disabled={!card.dueDate}
                    compact
                  />
                </div>
              </div>
            </div>

            {/* Start Date Popover */}
            <Popover
              isOpen={isStartDatePickerOpen}
              onClose={() => setIsStartDatePickerOpen(false)}
              triggerRef={startDateTriggerRef}
              title="Start Date"
            >
              <DatePicker
                label="Start Date"
                initialDate={card.startDate}
                onSave={date => {
                  updateCard.mutate({ startDate: date })
                  setIsStartDatePickerOpen(false)
                }}
              />
            </Popover>

            {/* Due Date Popover */}
            <Popover
              isOpen={isDatePickerOpen}
              onClose={() => setIsDatePickerOpen(false)}
              triggerRef={dueDateTriggerRef}
              title="Due Date"
            >
              <DatePicker
                label="Due Date"
                initialDate={card.dueDate}
                onSave={date => {
                  updateCard.mutate({ dueDate: date })
                  setIsDatePickerOpen(false)
                }}
              />
            </Popover>

            <div className="flex flex-col gap-3">
              <h3 className="font-heading m-0 flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
                Add to card
              </h3>
              <div className="flex flex-col gap-2">
                <ChecklistCreator onCreate={title => createChecklist.mutate(title)} />

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
                        className={`font-body flex cursor-pointer items-center gap-2.5 border border-black bg-white p-2 px-3 text-left text-[13px] font-bold transition-all ${card.priority === p.id ? 'shadow-inner-brutal bg-active' : 'hover:shadow-brutal-md hover:bg-hover hover:-translate-0.5'}`}
                        onClick={() => {
                          updateCard.mutate({ priority: p.id as Card['priority'] })
                          setIsPriorityOpen(false)
                        }}
                      >
                        <span
                          className="h-3 w-3 border border-black"
                          style={{ backgroundColor: p.color }}
                        />
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
                  <div className="flex min-w-70 flex-col p-1">
                    <Input
                      placeholder="Enter image URL..."
                      value={coverUrl}
                      onChange={e => setCoverUrl(e.target.value)}
                      onKeyDown={e => {
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
            <TaskAssignees
              taskId={taskId}
              boardId={boardId}
              currentAssignees={card.assignees || []}
            />

            <div className="flex flex-col gap-4">
              <h3 className="font-heading m-0 flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
                Details
              </h3>
              <div className="shadow-brutal-sm hover:shadow-brutal-md grid grid-cols-2 gap-4 border border-black bg-white p-4 transition-all hover:-translate-0.5">
                <div className="flex flex-col gap-1">
                  <span className="text-text-subtle text-[9px] font-extrabold uppercase">Position</span>
                  <span className="text-[13px] font-extrabold text-black">{card.position}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-text-subtle text-[9px] font-extrabold uppercase">Priority</span>
                  <span
                    className="text-[13px] font-extrabold text-black"
                    style={{
                      color: PRIORITIES.find(p => p.id === card.priority)?.color || 'inherit',
                    }}
                  >
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
          cardId={taskId}
          onMove={(columnId, beforeTaskId, afterTaskId) =>
            moveCard.mutate({ columnId, beforeTaskId, afterTaskId })
          }
          onCancel={() => setIsMoving(false)}
        />
      )}
    </div>
  )
}

// Backwards compatibility alias
export { TaskModal as CardModal }
