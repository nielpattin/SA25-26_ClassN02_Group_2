import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Comment } from '../CardModalTypes'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Avatar } from '../ui/Avatar'
import { formatDistanceToNow } from 'date-fns'
import { Trash2 } from 'lucide-react'

interface CommentSectionProps {
  cardId: string
  comments: Comment[]
  sessionUserId?: string
}

export function CommentSection({ cardId, comments, sessionUserId }: CommentSectionProps) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')

  const createComment = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await api.comments.post({ taskId: cardId, content })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] })
      setContent('')
    }
  })

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await api.comments({ id: commentId }).delete()
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', cardId] })
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-25"
        />
        <div className="flex justify-end">
          <Button 
            disabled={!content.trim()} 
            onClick={() => createComment.mutate(content)}
            className="px-6!"
          >
            Comment
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-4 group">
            <Avatar 
              src={comment.userImage} 
              fallback={comment.userName || 'U'} 
              size="md" 
            />
            <div className="flex-1 flex flex-col gap-2 p-4 bg-white border border-black shadow-brutal-sm hover:shadow-brutal-md hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-extrabold text-black uppercase tracking-wider">{comment.userName}</span>
                  <span className="text-[11px] font-extrabold text-black/40 uppercase tracking-widest">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {sessionUserId === comment.userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6! p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#E74C3C]"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
              <div className="text-[14px] font-semibold text-black leading-relaxed">{comment.content}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
