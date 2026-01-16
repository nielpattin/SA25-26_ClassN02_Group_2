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
      const { error } = await api.v1.comments.post({ taskId: cardId, content })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] })
      setContent('')
    }
  })

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await api.v1.comments({ id: commentId }).delete()
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
          <div key={comment.id} className="group flex gap-4">
            <Avatar 
              src={comment.userImage} 
              fallback={comment.userName || 'U'} 
              size="md" 
            />
            <div className="shadow-brutal-sm hover:shadow-brutal-md flex flex-1 flex-col gap-2 border border-black bg-white p-4 transition-all hover:-translate-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-[13px] font-extrabold tracking-wider text-black uppercase">{comment.userName}</span>
                  <span className="text-[11px] font-extrabold tracking-widest text-black/40 uppercase">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {sessionUserId === comment.userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6! p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#E74C3C]"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
              <div className="text-[14px] leading-relaxed font-semibold text-black">{comment.content}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
