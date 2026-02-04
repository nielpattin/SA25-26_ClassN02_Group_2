import { useState } from 'react'
import { Type, Paperclip, MessageSquare, Tag } from 'lucide-react'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { CommentSection } from '../comments'
import { AttachmentSection } from '../attachments/Attachments'
import { TaskChecklist } from './TaskChecklist'
import { TaskLabels } from './TaskLabels'
import { TaskActivity } from './TaskActivity'
import type { Attachment, UploadProgress, UploadError } from '../../hooks'
import type { Card, BoardMember } from '../CardModalTypes'

interface TaskModalMainContentProps {
  card: Card
  taskId: string
  boardId: string
  boardMembers: BoardMember[]
  sessionUserId?: string
  attachments: Attachment[]
  onUpdateDescription: (description: string) => void
  onAddLink: (name: string, url: string) => void
  onDeleteAttachment: (id: string) => void
  onUploadAttachment: (file: File) => Promise<void>
  onDownloadAttachment: (id: string) => Promise<void>
  isUploading: boolean
  uploadProgress: UploadProgress | null
  uploadError: UploadError | null
  onClearError: () => void
}

export function TaskModalMainContent({
  card,
  taskId,
  boardId,
  boardMembers,
  sessionUserId,
  attachments,
  onUpdateDescription,
  onAddLink,
  onDeleteAttachment,
  onUploadAttachment,
  onDownloadAttachment,
  isUploading,
  uploadProgress,
  uploadError,
  onClearError,
}: TaskModalMainContentProps) {
  const [description, setDescription] = useState('')
  const [isEditingDescription, setIsEditingDescription] = useState(false)

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto border-r border-black p-8">
      <div className="mb-4 shrink-0 overflow-hidden border-2 border-black bg-white shadow-brutal-md">
        <div className="flex items-center gap-2 border-b-2 border-black bg-accent p-1 px-3">
          <Tag size={12} strokeWidth={2.5} />
          <span className="font-heading text-[10px] font-extrabold tracking-widest text-black uppercase">
            Labels
          </span>
        </div>
        <div className="bg-white p-2.5">
          <TaskLabels taskId={taskId} boardId={boardId} cardLabels={card.labels || []} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 flex items-center gap-1.5 font-heading text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
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
                  onUpdateDescription(description)
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
            className="min-h-25 cursor-pointer border border-black bg-surface-overlay p-4 text-[14px] leading-relaxed wrap-break-word text-[#333333] shadow-brutal-sm transition-all hover:-translate-0.5 hover:bg-active hover:shadow-brutal-md"
            onClick={() => {
              setDescription(card.description || '')
              setIsEditingDescription(true)
            }}
          >
            {card.description || 'Add a more detailed description...'}
          </div>
        )}
      </div>

      <TaskChecklist taskId={taskId} boardId={boardId} />

      <div className="flex flex-col gap-3">
        <h3 className="m-0 flex items-center gap-1.5 font-heading text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
          <Paperclip size={14} /> Attachments
        </h3>
        <AttachmentSection
          attachments={attachments}
          onAddLink={onAddLink}
          onDelete={onDeleteAttachment}
          onUpload={onUploadAttachment}
          onDownload={onDownloadAttachment}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          uploadError={uploadError}
          onClearError={onClearError}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 flex items-center gap-1.5 font-heading text-[11px] font-extrabold tracking-widest text-black uppercase opacity-60">
          <MessageSquare size={14} /> Comments
        </h3>
        <CommentSection
          cardId={taskId}
          members={boardMembers}
          sessionUserId={sessionUserId}
        />
      </div>

      <TaskActivity taskId={taskId} />
    </div>
  )
}
