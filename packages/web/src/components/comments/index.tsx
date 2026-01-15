import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'
import { Comment } from '../CardModalTypes'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import { Avatar } from '../ui/Avatar'
import { formatDistanceToNow } from 'date-fns'
import { Trash2 } from 'lucide-react'
import './comments.css'

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
    <div className="comment-section">
      <div className="comment-creator">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="comment-input"
        />
        <div className="comment-creator-actions">
          <Button 
            disabled={!content.trim()} 
            onClick={() => createComment.mutate(content)}
          >
            Comment
          </Button>
        </div>
      </div>

      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment-item">
            <Avatar 
              src={comment.userImage} 
              fallback={comment.userName || 'U'} 
              size="md" 
            />
            <div className="comment-content-container">
              <div className="comment-author-info">
                <div className="comment-author-meta">
                  <span className="comment-author-name">{comment.userName}</span>
                  <span className="comment-date">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                {sessionUserId === comment.userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="comment-delete-btn"
                    onClick={() => deleteComment.mutate(comment.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
              <div className="comment-content">{comment.content}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
