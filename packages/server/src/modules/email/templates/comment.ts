import { baseTemplate } from './base'

interface CommentProps {
  authorName: string
  taskTitle: string
  commentContent: string
  taskLink: string
}

export const commentTemplate = ({
  authorName,
  taskTitle,
  commentContent,
  taskLink,
}: CommentProps) => baseTemplate(`
  <h2>New Comment</h2>
  <p><strong>${authorName}</strong> commented on <strong>${taskTitle}</strong>:</p>
  <div style="border: 2px solid #000000; padding: 16px; margin: 16px 0; background-color: #fafafa;">
    ${commentContent}
  </div>
  <a href="${taskLink}" class="button">View Task</a>
`)
