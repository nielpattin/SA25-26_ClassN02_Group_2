import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { MoveModal } from './MoveModal'
import { TaskModalHeader } from './TaskModalHeader'
import { TaskModalMainContent } from './TaskModalMainContent'
import { TaskModalSidebar } from './TaskModalSidebar'
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

export type { Card, Checklist as ChecklistType, Comment, Activity, Board, BoardMember } from '../CardModalTypes'
import type { Card, Board, BoardMember } from '../CardModalTypes'

export interface TaskModalProps {
  taskId?: string
  cardId?: string
  boardId: string
  onClose: () => void
}

export function TaskModal({ taskId: taskIdProp, cardId, boardId, onClose }: TaskModalProps) {
  const taskId = taskIdProp ?? cardId ?? ''
  const queryClient = useQueryClient()
  const [isMoving, setIsMoving] = useState(false)
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

  const updateCard = useMutation({
    mutationFn: async (updates: Partial<Card>) => {
      const { data, error } = await api.v1.tasks({ id: taskId }).patch({
        title: updates.title,
        description: updates.description ?? undefined,
        position: updates.position,
        columnId: updates.columnId,
        startDate: updates.startDate ? new Date(updates.startDate).toISOString() : undefined,
        dueDate: updates.dueDate ? new Date(updates.dueDate).toISOString() : undefined,
        priority: updates.priority,
        size: updates.size,
        reminder: updates.reminder,
        coverImageUrl: updates.coverImageUrl,
      })
      if (error) throw error
      return data
    },
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['card', taskId] })
      const previousCard = queryClient.getQueryData(['card', taskId])
      queryClient.setQueryData(['card', taskId], (old: Card | undefined) => old ? ({ ...old, ...updates }) : undefined)
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
    mutationFn: async (params: { columnId: string; position: string }) => {
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
      <div className="flex h-screen items-center justify-center bg-canvas font-heading font-extrabold text-black uppercase">
        Loading...
      </div>
    )

  return (
    <div
      className="fixed inset-0 z-1000 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-[95%] max-w-250 flex-col overflow-hidden border border-black bg-white shadow-brutal-xl"
        onClick={e => e.stopPropagation()}
      >
        <TaskModalHeader
          card={card}
          onUpdateTitle={(title) => updateCard.mutate({ title })}
          onMove={() => setIsMoving(true)}
          onArchive={() => archiveCard.mutate()}
          onClose={onClose}
          onRemoveCover={() => updateCard.mutate({ coverImageUrl: null })}
        />

        <div className="flex min-h-0 flex-1 flex-row overflow-hidden bg-white">
          <TaskModalMainContent
            card={card}
            taskId={taskId}
            boardId={boardId}
            boardMembers={boardMembers}
            sessionUserId={session?.user?.id}
            attachments={attachments}
            onUpdateDescription={(description) => updateCard.mutate({ description })}
            onAddLink={(name, url) => addLinkMutation.mutate({ name, url })}
            onDeleteAttachment={(id) => deleteMutation.mutate(id)}
            onUploadAttachment={async (file) => {
              setUploadError(null)
              try {
                await uploadMutation.mutateAsync({ file, onProgress: setUploadProgress })
                setUploadProgress(null)
              } catch (err) {
                setUploadProgress(null)
                setUploadError(err as UploadError)
              }
            }}
            onDownloadAttachment={async (id) => {
              const result = await downloadMutation.mutateAsync(id)
              window.open(result.url, '_blank', 'noopener,noreferrer')
            }}
            isUploading={uploadMutation.isPending}
            uploadProgress={uploadProgress}
            uploadError={uploadError}
            onClearError={() => setUploadError(null)}
          />

          <TaskModalSidebar
            card={card}
            taskId={taskId}
            boardId={boardId}
            onUpdateCard={(updates) => updateCard.mutate(updates)}
            onCreateChecklist={(title) => createChecklist.mutate(title)}
          />
        </div>
      </div>

      {isMoving && (
        <MoveModal
          boards={boards}
          currentBoardId={boardId}
          currentColumnId={card.columnId}
          cardId={taskId}
          onMove={(columnId, position) =>
            moveCard.mutate({ columnId, position })
          }
          onCancel={() => setIsMoving(false)}
        />
      )}
    </div>
  )
}

export { TaskModal as CardModal }
