import type { InferSelectModel } from 'drizzle-orm'
import { 
  tasks, columns, boards, labels, attachments, comments, boardMembers, checklists, checklistItems, taskDependencies,
  notifications, boardTemplates
} from '../db/schema'

export type Task = InferSelectModel<typeof tasks>
export type Column = InferSelectModel<typeof columns>
export type Board = InferSelectModel<typeof boards>
export type Label = InferSelectModel<typeof labels>
export type Attachment = InferSelectModel<typeof attachments>
export type Comment = InferSelectModel<typeof comments>
export type BoardMember = InferSelectModel<typeof boardMembers>
export type Checklist = InferSelectModel<typeof checklists>
export type ChecklistItem = InferSelectModel<typeof checklistItems>
export type TaskDependency = InferSelectModel<typeof taskDependencies>
export type Notification = InferSelectModel<typeof notifications>
export type BoardTemplate = InferSelectModel<typeof boardTemplates>

export interface KyteEvents {
  'task.created': { task: Task; userId: string; boardId: string }
  'task.updated': { task: Task; userId: string; boardId: string; changes: unknown }
  'task.moved': { 
    task: Task; 
    userId: string; 
    oldBoardId: string; 
    newBoardId: string; 
    oldColumnId: string; 
    isCrossBoard: boolean 
  }
  'task.archived': { task: Task; userId: string; boardId: string }
  'task.restored': { task: Task; userId: string; boardId: string }
  'task.deleted': { task: Task; userId: string; boardId: string }
  'task.copied': { task: Task; originalTaskId: string; userId: string; boardId: string }
  
  'task.dependency.created': { dependency: TaskDependency; userId: string; boardId: string }
  'task.dependency.deleted': { dependency: TaskDependency; userId: string; boardId: string }
  
  'task.assignee.added': { taskId: string; userId: string; actorId: string; boardId: string; assignee: unknown }
  'task.assignee.removed': { taskId: string; userId: string; actorId: string; boardId: string }
  'label.added': { taskId: string; labelId: string; userId: string; boardId: string; labelName?: string }
  'label.removed': { taskId: string; labelId: string; userId: string; boardId: string; labelName?: string }
  'attachment.added': { attachment: Attachment; userId: string; boardId: string }
  'attachment.deleted': { attachmentId: string; taskId: string; userId: string; boardId: string }
  
  'column.created': { column: Column; boardId: string; userId: string }
  'column.updated': { column: Column; boardId: string; userId: string; changes?: unknown }
  'column.moved': { column: Column; boardId: string; userId: string }
  'column.archived': { column: Column; boardId: string; userId: string }
  'column.restored': { column: Column; boardId: string; userId: string }
  'column.deleted': { columnId: string; boardId: string; userId: string }
  
  'board.created': { board: Board; userId: string }
  'board.updated': { board: Board; userId: string; changes?: unknown }
  'board.archived': { board: Board; userId: string }
  'board.restored': { board: Board; userId: string }
  'board.deleted': { boardId: string; userId: string }
  'board.starred': { boardId: string; userId: string }
  'board.unstarred': { boardId: string; userId: string }
  
  'board.member.added': { boardId: string; member: BoardMember; userId: string; actorId: string }
  'board.member.updated': { boardId: string; member: BoardMember; userId: string; actorId: string }
  'board.member.removed': { boardId: string; userId: string; actorId: string }

  'comment.created': { comment: Comment; boardId: string; userId: string }
  'comment.updated': { comment: Comment; boardId: string; userId: string }
  'comment.deleted': { commentId: string; boardId: string; userId: string }
  'comment.mention': { 
    mentionedUserId: string; 
    comment: Comment; 
    actorId: string; 
    taskId: string; 
    boardId: string 
  }

  'notification.created': {
    notification: Notification
    userId: string
  }

  'checklist.created': { checklist: Checklist; taskId: string; userId: string; boardId: string }
  'checklist.updated': { checklist: Checklist; taskId: string; userId: string; boardId: string; changes: unknown }
  'checklist.deleted': { checklist: Checklist; taskId: string; userId: string; boardId: string }
  'checklist.item.created': { item: ChecklistItem; taskId: string; userId: string; boardId: string }
  'checklist.item.updated': { item: ChecklistItem; taskId: string; userId: string; boardId: string; changes: unknown }
  'checklist.item.deleted': { item: ChecklistItem; taskId: string; userId: string; boardId: string }

  'template.approved': { template: BoardTemplate; adminId: string }
  'template.rejected': { template: BoardTemplate; adminId: string; reason?: string; comment?: string }
  'template.removed': { template: BoardTemplate; adminId: string }
}
