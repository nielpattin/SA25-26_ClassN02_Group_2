import { baseTemplate } from './base'

interface TaskAssignmentProps {
  assignerName: string
  taskTitle: string
  boardName: string
  taskLink: string
}

export const taskAssignmentTemplate = ({
  assignerName,
  taskTitle,
  boardName,
  taskLink,
}: TaskAssignmentProps) => baseTemplate(`
  <h2>New Task Assigned</h2>
  <p><strong>${assignerName}</strong> assigned you to a new task:</p>
  <div style="border: 2px solid #000000; padding: 16px; margin: 16px 0;">
    <p style="margin: 0; font-weight: bold;">${taskTitle}</p>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #666666;">in ${boardName}</p>
  </div>
  <a href="${taskLink}" class="button">View Task</a>
`)
