export interface Card {
  id: string
  title: string
  description: string | null
  columnId: string
  position: string
  priority: 'none' | 'low' | 'medium' | 'high' | 'urgent' | null
  dueDate: string | Date | null
  coverImageUrl?: string | null
  labels: string[] // Label IDs
  assignees: string[] // User IDs
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Checklist {
  id: string
  taskId: string
  title: string
  position: string
  items?: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  checklistId: string
  content: string
  isCompleted: boolean
  position: string
}

export interface Comment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string | Date
  updatedAt: string | Date
  userName: string | null
  userImage: string | null
}

export interface Column {
  id: string
  name: string
  position: string
  boardId: string
}

export interface Board {
  id: string
  name: string
  ownerId: string
  isPublic: boolean
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Activity {
  id: string
  taskId: string | null
  boardId: string
  userId: string
  action: string
  targetType: string
  changes: Record<string, unknown> | null
  createdAt: string | Date
  userName: string | null
  userImage: string | null
}

