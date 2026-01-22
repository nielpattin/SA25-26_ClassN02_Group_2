import { db } from '../../db'
import { members, users, taskAssignees, labels } from '../../db/schema'
import { sql, eq, inArray, ilike } from 'drizzle-orm'

export type DueStatus = 'overdue' | 'today' | 'week'

export interface ParsedSearchQuery {
  text: string
  assignees: string[]
  labelPatterns: string[]
  dueStatus: DueStatus | null
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const assignees: string[] = []
  const labelPatterns: string[] = []
  let dueStatus: DueStatus | null = null

  const assigneeRegex = /@(\w+)/g
  let match: RegExpExecArray | null

  while ((match = assigneeRegex.exec(query)) !== null) {
    assignees.push(match[1])
  }

  const labelRegex = /#(\w+)/g
  while ((match = labelRegex.exec(query)) !== null) {
    labelPatterns.push(match[1])
  }

  const dueRegex = /due:(overdue|today|week)/i
  const dueMatch = dueRegex.exec(query)
  if (dueMatch) {
    dueStatus = dueMatch[1].toLowerCase() as DueStatus
  }

  const text = query
    .replace(/@\w+/g, '')
    .replace(/#\w+/g, '')
    .replace(/due:\w+/gi, '')
    .trim()

  return { text, assignees, labelPatterns, dueStatus }
}

function toTsQuery(query: string): string {
  if (!query.trim()) return ''
  return query
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => `${word}:*`)
    .join(' & ')
}

function sqlArray(arr: string[]) {
  return sql.join(arr.map(id => sql`${id}`), sql`,`)
}

interface BoardSearchRow {
  id: string
  name: string
  description: string | null
  workspace_id: string | null
  rank: number
}

interface TaskSearchRow {
  id: string
  title: string
  description: string | null
  column_id: string
  board_id: string
  board_name: string
  rank: number
}

interface CountRow {
  count: string
}

export interface SearchFilters {
  boardId?: string
  assigneeUserIds?: string[]
  labelIds?: string[]
  dueStatus?: DueStatus
}

export const searchRepository = {
  searchBoards: async (
    userId: string,
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ results: Array<{
    id: string
    name: string
    description: string | null
    workspaceId: string | null
    rank: number
  }>, total: number }> => {
    const tsQuery = toTsQuery(query)

    const userWorkspaces = await db.select({ workspaceId: members.workspaceId })
      .from(members)
      .where(eq(members.userId, userId))

    const workspaceIds = userWorkspaces.map(w => w.workspaceId)

    if (workspaceIds.length === 0) {
      return { results: [], total: 0 }
    }

    const wsIds = sqlArray(workspaceIds)

    const results = await db.execute(sql`
      SELECT 
        id,
        name,
        description,
        workspace_id,
        ts_rank(search_vector, to_tsquery('english', ${tsQuery})) as rank
      FROM boards
      WHERE search_vector @@ to_tsquery('english', ${tsQuery})
        AND workspace_id IN (${wsIds})
        AND archived_at IS NULL
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `) as BoardSearchRow[]

    const countResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM boards
      WHERE search_vector @@ to_tsquery('english', ${tsQuery})
        AND workspace_id IN (${wsIds})
        AND archived_at IS NULL
    `) as CountRow[]

    const total = parseInt(countResult[0]?.count ?? '0', 10)

    return {
      results: results.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        workspaceId: r.workspace_id,
        rank: r.rank,
      })),
      total,
    }
  },

  searchTasks: async (
    userId: string,
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ results: Array<{
    id: string
    title: string
    description: string | null
    columnId: string
    boardId: string
    boardName: string
    rank: number
  }>, total: number }> => {
    const tsQuery = toTsQuery(query)
    const { boardId, assigneeUserIds, labelIds, dueStatus } = filters

    const userWorkspaces = await db.select({ workspaceId: members.workspaceId })
      .from(members)
      .where(eq(members.userId, userId))

    const workspaceIds = userWorkspaces.map(w => w.workspaceId)

    if (workspaceIds.length === 0) {
      return { results: [], total: 0 }
    }

    const wsIds = sqlArray(workspaceIds)

    const boardFilter = boardId
      ? sql`AND b.id = ${boardId}`
      : sql``

    const hasAssigneeFilter = assigneeUserIds && assigneeUserIds.length > 0
    const assigneeJoin = hasAssigneeFilter
      ? sql`JOIN task_assignees ta ON t.id = ta.task_id`
      : sql``
    const assigneeFilter = hasAssigneeFilter
      ? sql`AND ta.user_id IN (${sqlArray(assigneeUserIds)})`
      : sql``

    const hasLabelFilter = labelIds && labelIds.length > 0
    const labelJoin = hasLabelFilter
      ? sql`JOIN task_labels tl ON t.id = tl.task_id`
      : sql``
    const labelFilter = hasLabelFilter
      ? sql`AND tl.label_id IN (${sqlArray(labelIds)})`
      : sql``

    const dueFilter = (() => {
      if (!dueStatus) return sql``
      switch (dueStatus) {
        case 'overdue':
          return sql`AND t.due_date IS NOT NULL AND t.due_date < NOW()`
        case 'today':
          return sql`AND t.due_date IS NOT NULL AND t.due_date >= NOW() AND t.due_date < NOW() + INTERVAL '24 hours'`
        case 'week':
          return sql`AND t.due_date IS NOT NULL AND t.due_date >= NOW() AND t.due_date < NOW() + INTERVAL '7 days'`
        default:
          return sql``
      }
    })()

    const hasTextQuery = tsQuery.length > 0
    const textSearchFilter = hasTextQuery
      ? sql`AND (t.title ILIKE ${`%${query}%`} OR t.description ILIKE ${`%${query}%`})`
      : sql``
    const rankSelect = sql`1.0 as rank`

    const needsDistinct = hasAssigneeFilter || hasLabelFilter
    const distinctClause = needsDistinct ? sql`DISTINCT` : sql``

    const results = await db.execute(sql`
      SELECT ${distinctClause}
        t.id,
        t.title,
        t.description,
        t.column_id,
        b.id as board_id,
        b.name as board_name,
        ${rankSelect}
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      ${assigneeJoin}
      ${labelJoin}
      WHERE b.workspace_id IN (${wsIds})
        AND t.archived_at IS NULL
        AND c.archived_at IS NULL
        AND b.archived_at IS NULL
        ${textSearchFilter}
        ${boardFilter}
        ${assigneeFilter}
        ${labelFilter}
        ${dueFilter}
      ORDER BY rank DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `) as TaskSearchRow[]

    const countResult = await db.execute(sql`
      SELECT COUNT(${distinctClause} t.id) as count
      FROM tasks t
      JOIN columns c ON t.column_id = c.id
      JOIN boards b ON c.board_id = b.id
      ${assigneeJoin}
      ${labelJoin}
      WHERE b.workspace_id IN (${wsIds})
        AND t.archived_at IS NULL
        AND c.archived_at IS NULL
        AND b.archived_at IS NULL
        ${textSearchFilter}
        ${boardFilter}
        ${assigneeFilter}
        ${labelFilter}
        ${dueFilter}
    `) as CountRow[]

    const total = parseInt(countResult[0]?.count ?? '0', 10)

    return {
      results: results.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        columnId: r.column_id,
        boardId: r.board_id,
        boardName: r.board_name,
        rank: r.rank,
      })),
      total,
    }
  },

  resolveAssigneeUserIds: async (
    currentUserId: string,
    usernames: string[]
  ): Promise<string[]> => {
    if (usernames.length === 0) return []

    const resolvedIds: string[] = []
    const usernamesToLookup: string[] = []

    for (const username of usernames) {
      if (username.toLowerCase() === 'me') {
        resolvedIds.push(currentUserId)
      } else {
        usernamesToLookup.push(username)
      }
    }

    if (usernamesToLookup.length > 0) {
      const foundUsers = await db.select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.name, usernamesToLookup))

      for (const user of foundUsers) {
        resolvedIds.push(user.id)
      }
    }

    return resolvedIds
  },

  resolveLabelIds: async (
    labelPatterns: string[]
  ): Promise<string[]> => {
    if (labelPatterns.length === 0) return []

    const conditions = labelPatterns.map(pattern => ilike(labels.name, `%${pattern}%`))

    const foundLabels = await db.select({ id: labels.id })
      .from(labels)
      .where(sql`(${sql.join(conditions, sql` OR `)})`)

    return foundLabels.map(l => l.id)
  },
}
