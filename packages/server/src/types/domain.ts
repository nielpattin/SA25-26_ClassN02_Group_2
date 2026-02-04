// Shared domain types for Kyte
// These are the canonical type definitions used by both server and client

// Priority and size enums
export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none'
export type Size = 'xs' | 's' | 'm' | 'l' | 'xl'
export type Reminder = 'none' | 'on_day' | '1_day' | '2_days' | '1_week'
export type BoardRole = 'admin' | 'member' | 'viewer'
export type WorkspaceRole = 'owner' | 'admin' | 'member'

// Label type
export interface Label {
  id: string
  name: string
  color: string
  boardId: string
}

// Task assignee (user subset)
export interface TaskAssignee {
  userId: string
  name: string | null
  image: string | null
}

// Checklist progress for task cards
export interface ChecklistProgress {
  completed: number
  total: number
}

// Base task type
export interface Task {
  id: string
  title: string
  description: string | null
  position: string
  columnId: string
  priority: Priority | null
  size: Size | null
  reminder: Reminder
  startDate: string | null
  dueDate: string | null
  coverImageUrl: string | null
  archivedAt: string | null
  version: number
  createdAt: string
  updatedAt: string
}

// Task with enriched data (for list views)
export interface TaskWithLabels extends Omit<Task, 'priority' | 'size'> {
  labels: Label[]
  assignees: TaskAssignee[]
  checklistProgress: ChecklistProgress | null
  attachmentsCount: number
  priority?: Priority | null
  size?: Size | null
}

// Column type
export interface Column {
  id: string
  name: string
  position: string
  boardId: string
  version: number
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

// Board type
export interface Board {
  id: string
  name: string
  description: string | null
  ownerId: string
  workspaceId: string | null
  isPublic: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

// Board member
export interface BoardMember {
  id: string
  userId: string
  boardId: string
  role: BoardRole
  userName: string | null
  userImage: string | null
}

// Workspace type
export interface Workspace {
  id: string
  name: string
  slug: string
  personal: boolean
  createdAt: string
}

// Comment type
export interface Comment {
  id: string
  taskId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
  userName: string | null
  userImage: string | null
}

// Activity type
export interface Activity {
  id: string
  taskId: string | null
  boardId: string
  userId: string
  action: string
  targetType: string
  changes: Record<string, unknown> | null
  createdAt: string
  userName: string | null
  userImage: string | null
}

// Checklist types
export interface ChecklistItem {
  id: string
  checklistId: string
  content: string
  isCompleted: boolean
  position: string
}

export interface Checklist {
  id: string
  taskId: string
  title: string
  position: string
  items: ChecklistItem[]
}

// Attachment type
export interface Attachment {
  id: string
  taskId: string
  name: string
  url: string | null
  type: 'file' | 'link'
  size: number | null
  mimeType: string | null
  createdAt: string
}
