import { useState } from 'react'
import { Comment, BoardMember } from '../CardModalTypes'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { formatDistanceToNow } from 'date-fns'
import { Trash2, Pencil, X, Check } from 'lucide-react'
import { MentionInput } from './MentionInput'
import { MentionRenderer } from './MentionRenderer'
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from '../../hooks'

export { MentionInput, MentionRenderer }

interface CommentSectionProps {
  cardId: string
  comments?: Comment[]
  members: BoardMember[]
  sessionUserId?: string
}

export function CommentSection({ cardId, comments: initialComments, members, sessionUserId }: CommentSectionProps) {
  const [content, setContent] = useState('')
  const { data: comments = initialComments || [] } = useComments(cardId)
  const createComment = useCreateComment(cardId)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <MentionInput
          value={content}
          onChange={setContent}
          members={members}
          placeholder="Write a comment..."
          className="min-h-25"
        />
        <div className="flex justify-end">
          <Button 
            disabled={!content.trim()} 
            onClick={() => {
              createComment.mutate(content, {
                onSuccess: () => setContent('')
              })
            }}
            className="px-6!"
          >
            Comment
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {comments.map((comment) => (
          <CommentItem 
            key={comment.id}
            comment={comment}
            members={members}
            cardId={cardId}
            sessionUserId={sessionUserId}
          />
        ))}
      </div>
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  members: BoardMember[]
  cardId: string
  sessionUserId?: string
}

function CommentItem({ comment, members, cardId, sessionUserId }: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const updateComment = useUpdateComment(cardId)
  const deleteComment = useDeleteComment(cardId)

  const handleCancel = () => {
    setEditContent(comment.content)
    setIsEditing(false)
  }

  return (
    <div className="group flex gap-4">
      <Avatar 
        src={comment.userImage} 
        fallback={comment.userName || 'U'} 
        size="md" 
      />
      <div className="flex flex-1 flex-col gap-2 border border-black bg-white p-4 shadow-brutal-sm transition-all hover:-translate-0.5 hover:shadow-brutal-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-extrabold tracking-wider text-black uppercase">{comment.userName}</span>
            <span className="text-[11px] font-extrabold tracking-widest text-black/40 uppercase">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              {comment.updatedAt !== comment.createdAt && ' (edited)'}
            </span>
          </div>
          {sessionUserId === comment.userId && !isEditing && (
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6! p-0 hover:text-[#3498DB]"
                onClick={() => setIsEditing(true)}
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6! p-0 hover:text-[#E74C3C]"
                onClick={() => deleteComment.mutate(comment.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          )}
          {isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6! p-0 text-success-border"
                onClick={() => {
                  updateComment.mutate({ id: comment.id, content: editContent }, {
                    onSuccess: () => setIsEditing(false)
                  })
                }}
                disabled={!editContent.trim() || editContent === comment.content}
              >
                <Check size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6! p-0 text-[#E74C3C]"
                onClick={handleCancel}
              >
                <X size={14} />
              </Button>
            </div>
          )}
        </div>
        
        {isEditing ? (
          <div className="mt-1">
            <MentionInput
              value={editContent}
              onChange={setEditContent}
              members={members}
              autoFocus
              className="min-h-20"
            />
          </div>
        ) : (
          <div className="text-[14px] leading-relaxed font-semibold text-black">
            <MentionRenderer content={comment.content} members={members} />
          </div>
        )}
      </div>
    </div>
  )
}
