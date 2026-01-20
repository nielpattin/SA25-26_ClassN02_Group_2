export type NotificationType = 'mention' | 'assignment' | 'due_soon' | 'due_urgent' | 'overdue' | 'comment' | 'board_invite'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body?: string | null
  read: boolean
  createdAt: string | Date
  boardId?: string | null
  taskId?: string | null
}
