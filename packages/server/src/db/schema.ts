import { pgTable, pgEnum, varchar, text, integer, timestamp, uuid, boolean, primaryKey, jsonb } from 'drizzle-orm/pg-core'

/** Organization membership role */
export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member', 'viewer'])

/** Board-level access role */
export const boardRoleEnum = pgEnum('board_role', ['admin', 'member', 'viewer'])

/** Board visibility setting */
export const visibilityEnum = pgEnum('visibility', ['private', 'organization', 'public'])

/** Task priority level */
export const priorityEnum = pgEnum('priority', ['urgent', 'high', 'medium', 'low', 'none'])

/** User interface theme preference */
export const themeEnum = pgEnum('theme', ['light', 'dark', 'system'])

/** Email notification frequency */
export const emailDigestEnum = pgEnum('email_digest', ['instant', 'daily', 'weekly', 'none'])

/** Attachment type - file upload or external link */
export const attachmentTypeEnum = pgEnum('attachment_type', ['link', 'file'])

/** In-app notification types */
export const notificationTypeEnum = pgEnum('notification_type', [
  'mention', 'assignment', 'due_soon', 'due_urgent', 'overdue', 'comment', 'board_invite'
])

/** Activity log action types */
export const activityActionEnum = pgEnum('activity_action', [
  'created', 'updated', 'deleted', 'moved', 'assigned', 'unassigned',
  'completed', 'uncompleted', 'archived', 'restored', 'label_added',
  'label_removed', 'due_date_set', 'attachment_added'
])

/** Activity log target entity types */
export const activityTargetEnum = pgEnum('activity_target', [
  'task', 'column', 'board', 'comment', 'checklist', 'checklist_item', 'attachment', 'label'
])

/**
 * User accounts - Better Auth compatible
 * @see https://better-auth.com
 */
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  /** ISO 639-1 language code (en, es, ja) */
  locale: varchar('locale', { length: 10 }).default('en').notNull(),
  /** IANA timezone (America/New_York) */
  timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
  theme: themeEnum().default('system').notNull(),
  emailDigest: emailDigestEnum().default('daily').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Team workspaces - personal or shared */
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  /** URL-friendly identifier */
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  /** True for auto-created personal workspace */
  personal: boolean('personal').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Organization membership with role */
export const members = pgTable('members', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: orgRoleEnum().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Kanban boards */
export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
  visibility: visibilityEnum().default('private').notNull(),
  /** Fractional index for ordering */
  position: text('position').notNull(),
  /** Optimistic locking version */
  version: integer('version').default(1).notNull(),
  /** Soft delete timestamp */
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Board-level access control (separate from org membership) */
export const boardMembers = pgTable('board_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: boardRoleEnum().default('member').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** User's favorite/starred boards */
export const starredBoards = pgTable('starred_boards', {
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.boardId] }),
])

/** Board columns (e.g., To Do, In Progress, Done) */
export const columns = pgTable('columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  /** Fractional index for ordering */
  position: text('position').notNull(),
  /** Optimistic locking version */
  version: integer('version').default(1).notNull(),
  /** Soft delete timestamp */
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/**
 * Tasks (cards) within columns
 * @description DB uses 'tasks', UI shows 'cards' (Kanban convention)
 */
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  /** Markdown content */
  description: text('description'),
  columnId: uuid('column_id').references(() => columns.id, { onDelete: 'cascade' }).notNull(),
  /** Fractional index for ordering within column */
  position: text('position').notNull(),
  priority: priorityEnum(),
  dueDate: timestamp('due_date'),
  coverImageUrl: text('cover_image_url'),
  /** Optimistic locking version */
  version: integer('version').default(1).notNull(),
  /** Soft delete timestamp */
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Task assignees - supports multiple assignees per task */
export const taskAssignees = pgTable('task_assignees', {
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  assignedBy: text('assigned_by').references(() => users.id),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.userId] }),
])

/** Board-level labels for categorizing tasks */
export const labels = pgTable('labels', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  /** Hex color code (#FF5733) */
  color: varchar('color', { length: 7 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Task-label junction table */
export const taskLabels = pgTable('task_labels', {
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  labelId: uuid('label_id').references(() => labels.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.labelId] }),
])

/** Checklists within tasks */
export const checklists = pgTable('checklists', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  /** Fractional index for ordering */
  position: text('position').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Individual items within a checklist */
export const checklistItems = pgTable('checklist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  checklistId: uuid('checklist_id').references(() => checklists.id, { onDelete: 'cascade' }).notNull(),
  content: varchar('content', { length: 500 }).notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  /** Fractional index for ordering */
  position: text('position').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** File uploads and external links attached to tasks */
export const attachments = pgTable('attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  type: attachmentTypeEnum().notNull(),
  /** File URL (SeaweedFS) or external link URL */
  url: text('url').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }),
  /** File size in bytes */
  size: integer('size'),
  uploadedBy: text('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Task comments with Markdown support */
export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  /** Markdown content */
  content: text('content').notNull(),
  /** Soft delete - 7 day retention */
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

/** Parsed @mentions from comments for notification targeting */
export const commentMentions = pgTable('comment_mentions', {
  id: uuid('id').defaultRandom().primaryKey(),
  commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Audit log for all user actions */
export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  action: activityActionEnum().notNull(),
  targetType: activityTargetEnum().notNull(),
  targetId: uuid('target_id').notNull(),
  /** Before/after values for updates */
  changes: jsonb('changes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** In-app notifications */
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: notificationTypeEnum().notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body'),
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: uuid('resource_id'),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Saved board templates for quick creation */
export const boardTemplates = pgTable('board_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdBy: text('created_by').references(() => users.id),
  /** NULL for personal templates */
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),
  /** Array of { name, position } */
  columnDefinitions: jsonb('column_definitions').notNull(),
  /** Array of { name, color } */
  defaultLabels: jsonb('default_labels'),
  /** Visible to all org members */
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

/** Saved task templates for quick creation */
export const taskTemplates = pgTable('task_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
  /** Auto-prefix for new task titles */
  titlePrefix: varchar('title_prefix', { length: 100 }),
  /** Markdown template with placeholders */
  descriptionTemplate: text('description_template'),
  /** Label IDs to auto-apply */
  defaultLabels: jsonb('default_labels'),
  /** Checklist items to auto-create */
  defaultChecklist: jsonb('default_checklist'),
  createdBy: text('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const table = {
  users, organizations, members,
  boards, boardMembers, starredBoards, columns,
  tasks, taskAssignees,
  labels, taskLabels,
  checklists, checklistItems,
  attachments,
  comments, commentMentions,
  activities, notifications,
  boardTemplates, taskTemplates,
} as const
