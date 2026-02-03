import { pgTable, pgEnum, varchar, text, integer, timestamp, uuid, boolean, primaryKey, jsonb, unique, index } from 'drizzle-orm/pg-core'

// Template marketplace status
export const templateStatusEnum = pgEnum('template_status', ['none', 'pending', 'approved', 'rejected'])

// Workspace membership role
export const workspaceRoleEnum = pgEnum('workspace_role', ['owner', 'admin', 'member', 'viewer'])

// Board-level access role
export const boardRoleEnum = pgEnum('board_role', ['admin', 'member', 'viewer'])

// Board visibility setting
export const visibilityEnum = pgEnum('visibility', ['private', 'workspace', 'public'])

// Platform admin roles
export const adminRoleEnum = pgEnum('admin_role', ['super_admin', 'moderator', 'support'])

// Task priority level
export const priorityEnum = pgEnum('priority', ['urgent', 'high', 'medium', 'low', 'none'])

// User interface theme preference
export const themeEnum = pgEnum('theme', ['light', 'dark', 'system'])

// Email notification frequency
export const emailDigestEnum = pgEnum('email_digest', ['instant', 'daily', 'weekly', 'none'])

// Attachment type - file upload or external link
export const attachmentTypeEnum = pgEnum('attachment_type', ['link', 'file'])

// Task reminder timing
export const reminderEnum = pgEnum('reminder', ['none', 'on_day', '1_day', '2_days', '1_week'])

// In-app notification types
export const notificationTypeEnum = pgEnum('notification_type', [
	'mention', 'assignment', 'due_soon', 'due_urgent', 'overdue', 'comment', 'board_invite'
])

// Activity log action types
export const activityActionEnum = pgEnum('activity_action', [
	'created', 'updated', 'deleted', 'moved', 'moved_out', 'assigned', 'unassigned',
	'completed', 'uncompleted', 'archived', 'restored', 'label_added',
	'label_removed', 'due_date_set', 'attachment_added'
])

// Activity log target entity types
export const activityTargetEnum = pgEnum('activity_target', [
	'task', 'column', 'board', 'comment', 'checklist', 'checklist_item', 'attachment', 'label', 'user'
])

// Dependency types between tasks
export const dependencyTypeEnum = pgEnum('dependency_type', [
	'finish_to_start', 'start_to_start', 'finish_to_finish'
])

// User accounts - Better Auth compatible

export const users = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	// ISO 639-1 language code (en, es, ja)
	locale: varchar('locale', { length: 10 }).default('en').notNull(),
	// IANA timezone (America/New_York)
	timezone: varchar('timezone', { length: 50 }).default('UTC').notNull(),
	theme: themeEnum().default('system').notNull(),
	emailDigest: emailDigestEnum().default('daily').notNull(),
	adminRole: adminRoleEnum('admin_role'),
	notificationPreferences: jsonb('notification_preferences').default({
		mention: { inApp: true, email: true },
		assignment: { inApp: true, email: true },
		due_soon: { inApp: true, email: true },
		due_urgent: { inApp: true, email: true },
		overdue: { inApp: true, email: true },
		comment: { inApp: true, email: true },
		board_invite: { inApp: true, email: true },
	}).notNull(),
	deletedAt: timestamp('deleted_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Better Auth - Active sessions
export const sessions = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Better Auth - OAuth providers & credentials
export const accounts = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Better Auth - Email verification & password reset tokens
export const verifications = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Team workspaces - personal or shared
export const workspaces = pgTable('workspaces', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	// URL-friendly identifier
	slug: varchar('slug', { length: 255 }).notNull().unique(),
	// True for auto-created personal workspace
	personal: boolean('personal').default(false).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Workspace membership with role
export const members = pgTable('members', {
	id: uuid('id').defaultRandom().primaryKey(),
	workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	role: workspaceRoleEnum().notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Kanban boards
export const boards = pgTable('boards', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
	ownerId: text('owner_id').references(() => users.id, { onDelete: 'set null' }),
	visibility: visibilityEnum().default('private').notNull(),
	// Fractional index for ordering
	position: text('position').notNull(),
	// Optimistic locking version
	version: integer('version').default(1).notNull(),
	// Soft delete timestamp
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Board-level access control (separate from org membership)
export const boardMembers = pgTable('board_members', {
	id: uuid('id').defaultRandom().primaryKey(),
	boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	role: boardRoleEnum().default('member').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// User's favorite/starred boards
export const starredBoards = pgTable('starred_boards', {
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
	primaryKey({ columns: [table.userId, table.boardId] }),
])

// Board columns (e.g., To Do, In Progress, Done)
export const columns = pgTable('columns', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
	// Fractional index for ordering
	position: text('position').notNull(),
	// Optimistic locking version
	version: integer('version').default(1).notNull(),
	// Soft delete timestamp
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Tasks (cards) within columns
export const tasks = pgTable('tasks', {
	id: uuid('id').defaultRandom().primaryKey(),
	title: varchar('title', { length: 255 }).notNull(),
	// Markdown content
	description: text('description'),
	columnId: uuid('column_id').references(() => columns.id, { onDelete: 'cascade' }).notNull(),
	// Fractional index for ordering within column
	position: text('position').notNull(),
	priority: priorityEnum(),
	startDate: timestamp('start_date'),
	dueDate: timestamp('due_date'),
	reminder: reminderEnum().default('none').notNull(),
	reminderSentAt: timestamp('reminder_sent_at'),
	overdueSentAt: timestamp('overdue_sent_at'),
	coverImageUrl: text('cover_image_url'),
	// Optimistic locking version
	version: integer('version').default(1).notNull(),
	// Soft delete timestamp
	archivedAt: timestamp('archived_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Task assignees - supports multiple assignees per task
export const taskAssignees = pgTable('task_assignees', {
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	assignedAt: timestamp('assigned_at').defaultNow().notNull(),
	assignedBy: text('assigned_by').references(() => users.id),
}, (table) => [
	primaryKey({ columns: [table.taskId, table.userId] }),
])

// Board-level labels for categorizing tasks
export const labels = pgTable('labels', {
	id: uuid('id').defaultRandom().primaryKey(),
	boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	// Hex color code (#FF5733)
	color: varchar('color', { length: 7 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Task-label junction table
export const taskLabels = pgTable('task_labels', {
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	labelId: uuid('label_id').references(() => labels.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
	primaryKey({ columns: [table.taskId, table.labelId] }),
])

// Task dependencies for Gantt/timeline view
export const taskDependencies = pgTable('task_dependencies', {
	id: uuid('id').defaultRandom().primaryKey(),
	blockingTaskId: uuid('blocking_task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	blockedTaskId: uuid('blocked_task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	type: dependencyTypeEnum().default('finish_to_start').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
	unique('task_dependencies_pair_idx').on(table.blockingTaskId, table.blockedTaskId),
])

// Checklists within tasks
export const checklists = pgTable('checklists', {
	id: uuid('id').defaultRandom().primaryKey(),
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	title: varchar('title', { length: 255 }).notNull(),
	// Fractional index for ordering
	position: text('position').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Individual items within a checklist
export const checklistItems = pgTable('checklist_items', {
	id: uuid('id').defaultRandom().primaryKey(),
	checklistId: uuid('checklist_id').references(() => checklists.id, { onDelete: 'cascade' }).notNull(),
	content: varchar('content', { length: 500 }).notNull(),
	isCompleted: boolean('is_completed').default(false).notNull(),
	// Fractional index for ordering
	position: text('position').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// File uploads and external links attached to tasks
export const attachments = pgTable('attachments', {
	id: uuid('id').defaultRandom().primaryKey(),
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	type: attachmentTypeEnum().notNull(),
	// File URL (SeaweedFS) or external link URL
	url: text('url').notNull(),
	name: varchar('name', { length: 255 }).notNull(),
	mimeType: varchar('mime_type', { length: 100 }),
	// File size in bytes
	size: integer('size'),
	uploadedBy: text('uploaded_by').references(() => users.id),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Task comments with Markdown support
export const comments = pgTable('comments', {
	id: uuid('id').defaultRandom().primaryKey(),
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	// Markdown content
	content: text('content').notNull(),
	// Soft delete - 7 day retention
	deletedAt: timestamp('deleted_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Parsed @mentions from comments for notification targeting
export const commentMentions = pgTable('comment_mentions', {
	id: uuid('id').defaultRandom().primaryKey(),
	commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }).notNull(),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Audit log for all user actions
export const activities = pgTable('activities', {
	id: uuid('id').defaultRandom().primaryKey(),
	boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
	taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	action: activityActionEnum().notNull(),
	targetType: activityTargetEnum().notNull(),
	targetId: uuid('target_id').notNull(),
	// Before/after values for updates
	changes: jsonb('changes'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Platform admin audit log
export const adminAuditLog = pgTable('admin_audit_log', {
	id: uuid('id').defaultRandom().primaryKey(),
	adminId: text('admin_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	action: text('action').notNull(),
	targetType: text('target_type').notNull(),
	targetId: text('target_id'),
	metadata: jsonb('metadata'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
	index('admin_audit_log_admin_idx').on(table.adminId),
	index('admin_audit_log_action_idx').on(table.action),
	index('admin_audit_log_created_at_idx').on(table.createdAt),
])

// In-app notifications
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

// Saved board templates for quick creation
export const boardTemplates = pgTable('board_templates', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	description: text('description'),
	createdBy: text('created_by').references(() => users.id),
	// NULL for personal templates
	workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
	// Array of { name, position }
	columnDefinitions: jsonb('column_definitions').notNull(),
	// Array of { name, color }
	defaultLabels: jsonb('default_labels'),
	// Visible to all org members
	isPublic: boolean('is_public').default(false).notNull(),
	// Marketplace metadata
	status: templateStatusEnum('status').default('none').notNull(),
	categories: text('categories').array(),
	submittedAt: timestamp('submitted_at'),
	approvedAt: timestamp('approved_at'),
	approvedBy: text('approved_by').references(() => users.id),
	takedownRequestedAt: timestamp('takedown_requested_at'),
	takedownAt: timestamp('takedown_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Saved task templates for quick creation
export const taskTemplates = pgTable('task_templates', {
	id: uuid('id').defaultRandom().primaryKey(),
	boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
	name: text('name').notNull(),
	description: text('description'),
	content: jsonb('content'),
	createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const viewModeEnum = pgEnum('view_mode', ['kanban', 'calendar', 'gantt'])
export const zoomModeEnum = pgEnum('zoom_mode', ['day', 'week', 'month', 'quarter'])

export const userBoardPreferences = pgTable('user_board_preferences', {
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
	view: viewModeEnum().default('kanban').notNull(),
	zoomMode: zoomModeEnum().default('month').notNull(),
	filters: jsonb('filters').default({
		labelIds: [],
		assigneeIds: [],
		dueDate: null,
		status: 'active',
	}).notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
	primaryKey({ columns: [table.userId, table.boardId] }),
])

// User's recently visited boards for search quick-access
export const boardVisits = pgTable('board_visits', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	boardId: uuid('board_id').references(() => boards.id, { onDelete: 'cascade' }).notNull(),
	visitedAt: timestamp('visited_at').defaultNow().notNull(),
}, (table) => [
	unique('board_visits_user_board_idx').on(table.userId, table.boardId),
	index('board_visits_user_visited_idx').on(table.userId, table.visitedAt),
])

export const idempotencyStatusEnum = pgEnum('idempotency_status', ['pending', 'completed'])

export const idempotencyKeys = pgTable('idempotency_keys', {
	id: uuid('id').defaultRandom().primaryKey(),
	key: varchar('key', { length: 255 }).notNull(),
	userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
	requestHash: text('request_hash').notNull(),
	status: idempotencyStatusEnum().default('pending').notNull(),
	responseStatus: integer('response_status'),
	responseBody: jsonb('response_body'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	expiresAt: timestamp('expires_at').notNull(),
}, (table) => [
	unique('idempotency_user_key_idx').on(table.userId, table.key)
])

// Rate limiting for auth and other sensitive endpoints
export const rateLimits = pgTable('rate_limits', {
	key: text('key').primaryKey(),
	count: integer('count').default(0).notNull(),
	lastResetAt: timestamp('last_reset_at').defaultNow().notNull(),
})

export const table = {
	users, sessions, accounts, verifications,
	workspaces, members,
	boards, boardMembers, starredBoards, columns,
	tasks, taskAssignees,
	labels, taskLabels,
	taskDependencies,
	checklists, checklistItems,
	attachments,
	comments, commentMentions,
	activities, notifications,
	adminAuditLog,
	boardTemplates, taskTemplates,
	userBoardPreferences,
	templateStatusEnum,
	boardVisits,
	idempotencyKeys,
	rateLimits,
} as const
