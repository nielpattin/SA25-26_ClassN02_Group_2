import { baseTemplate } from './base'

interface OverdueProps {
  taskTitle: string
  dueDate: string
  boardName: string
  taskLink: string
  daysPastDue: number
}

export const overdueTemplate = ({
  taskTitle,
  dueDate,
  boardName,
  taskLink,
  daysPastDue,
}: OverdueProps) => baseTemplate(`
  <h2 style="color: #e11d48;">Task Overdue</h2>
  <p>The following task is <strong>${daysPastDue} ${daysPastDue === 1 ? 'day' : 'days'}</strong> past due:</p>
  <div style="border: 2px solid #e11d48; padding: 16px; margin: 16px 0; background-color: #fff1f2;">
    <p style="margin: 0; font-weight: bold;">${taskTitle}</p>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #666666;">in ${boardName}</p>
    <p style="margin: 8px 0 0 0; font-size: 14px; color: #e11d48; font-weight: bold;">Due: ${dueDate}</p>
  </div>
  <a href="${taskLink}" class="button" style="background-color: #e11d48; border-color: #e11d48;">View Task</a>
`)
