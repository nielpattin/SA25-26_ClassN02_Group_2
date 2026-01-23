import { baseTemplate } from './base'

interface MentionProps {
  mentionerName: string
  taskTitle: string
  commentContent: string
  taskLink: string
}

export const mentionTemplate = ({
  mentionerName,
  taskTitle,
  commentContent,
  taskLink,
}: MentionProps) => baseTemplate(`
  <h2>You were mentioned</h2>
  <p><strong>${mentionerName}</strong> mentioned you in a comment on <strong>${taskTitle}</strong>:</p>
  <blockquote style="border-left: 4px solid #000000; padding-left: 16px; margin: 16px 0; font-style: italic;">
    ${commentContent}
  </blockquote>
  <a href="${taskLink}" class="button">Reply to Comment</a>
`)
