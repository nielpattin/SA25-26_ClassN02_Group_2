import { baseTemplate } from './base'

interface DueSoonProps {
  taskTitle: string
  dueDate: string
  boardName: string
  taskLink: string
  timing: string
}

export const dueSoonTemplate = ({
  taskTitle,
  dueDate,
  boardName,
  taskLink,
  timing,
}: DueSoonProps) => baseTemplate(`
  <h2>Task Due Soon</h2>
  <p>The following task is due <strong>${timing}</strong>:</p>
  <div style="border: 2px solid #000000; padding: 16px; margin: 16px 0;">
    <p style="margin: 0; font-weight: bold;">${taskTitle}</p>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #666666;">in ${boardName}</p>
    <p style="margin: 8px 0 0 0; font-size: 14px;">Due: ${dueDate}</p>
  </div>
  <a href="${taskLink}" class="button">View Task</a>
`)
