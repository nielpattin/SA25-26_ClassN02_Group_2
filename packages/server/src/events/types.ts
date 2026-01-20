import type { InferSelectModel } from 'drizzle-orm'
import { 
  tasks, columns, boards, labels, attachments, comments, boardMembers, checklists, checklistItems
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

export interface KyteEvents {
  'task.created': { task: Task; userId: string; boardId: string }
  'task.updated': { task: Task; userId: string; boardId: string; changes: any }
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
  
  'task.assignee.added': { taskId: string; userId: string; actorId: string; boardId: string; assignee: any }
  'task.assignee.removed': { taskId: string; userId: string; actorId: string; boardId: string }
  'label.added': { taskId: string; labelId: string; userId: string; boardId: string; labelName?: string }
  'label.removed': { taskId: string; labelId: string; userId: string; boardId: string; labelName?: string }
  'attachment.added': { attachment: Attachment; userId: string; boardId: string }
  'attachment.deleted': { attachmentId: string; taskId: string; userId: string; boardId: string }
  
  'column.created': { column: Column; boardId: string; userId: string }
  'column.updated': { column: Column; boardId: string; userId: string; changes?: any }
  'column.moved': { column: Column; boardId: string; userId: string }
  'column.archived': { column: Column; boardId: string; userId: string }
  'column.deleted': { columnId: string; boardId: string; userId: string }
  
  'board.created': { board: Board; userId: string }
  'board.updated': { board: Board; userId: string; changes?: any }
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
    notification: any; // Using any for now to avoid circular dependency if needed, or I can import the type
    userId: string;
  }

  'checklist.created': { checklist: Checklist; taskId: string; userId: string; boardId: string }
  'checklist.updated': { checklist: Checklist; taskId: string; userId: string; boardId: string; changes: any }
  'checklist.deleted': { checklist: Checklist; taskId: string; userId: string; boardId: string }
  'checklist.item.created': { item: ChecklistItem; taskId: string; userId: string; boardId: string }
  'checklist.item.updated': { item: ChecklistItem; taskId: string; userId: string; boardId: string; changes: any }
  'checklist.item.deleted': { item: ChecklistItem; taskId: string; userId: string; boardId: string }
}
