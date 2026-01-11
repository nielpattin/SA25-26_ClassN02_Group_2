import { db } from '../../db'
import { tasks, columns, labels, taskLabels, taskAssignees, checklists, checklistItems, attachments, users } from '../../db/schema'
import { eq, asc, sql, and, isNull } from 'drizzle-orm'

export const taskRepository = {
  findById: async (id: string) => {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id))
    return task
  },

  findByColumnId: (columnId: string) =>
    db.select().from(tasks)
      .where(and(eq(tasks.columnId, columnId), isNull(tasks.archivedAt)))
      .orderBy(asc(tasks.position)),

  create: async (data: {
    title: string
    description?: string
    position: string
    columnId: string
    priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none'
    dueDate?: Date | null
    coverImageUrl?: string
  }) => {
    const [task] = await db.insert(tasks).values(data).returning()
    return task
  },

  update: async (id: string, data: {
    title?: string
    description?: string
    position?: string
    columnId?: string
    priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null
    dueDate?: Date | null
    coverImageUrl?: string | null
  }) => {
    const [task] = await db.update(tasks).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(tasks.id, id)).returning()
    return task
  },

  archive: async (id: string) => {
    const [task] = await db.update(tasks).set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(tasks.id, id)).returning()
    return task
  },

  restore: async (id: string) => {
    const [task] = await db.update(tasks).set({
      archivedAt: null,
      updatedAt: new Date(),
    }).where(eq(tasks.id, id)).returning()
    return task
  },

  delete: async (id: string) => {
    const [task] = await db.delete(tasks).where(eq(tasks.id, id)).returning()
    return task
  },

  getBoardIdFromColumn: async (columnId: string): Promise<string | null> => {
    const [col] = await db.select({ boardId: columns.boardId }).from(columns).where(eq(columns.id, columnId))
    return col?.boardId ?? null
  },

  getBoardIdFromTask: async (taskId: string): Promise<string | null> => {
    const [task] = await db.select({ columnId: tasks.columnId }).from(tasks).where(eq(tasks.id, taskId))
    if (!task || !task.columnId) return null
    return taskRepository.getBoardIdFromColumn(task.columnId)
  },

  // Assignees
  getAssignees: async (taskId: string) => {
    return db.select({
      userId: taskAssignees.userId,
      assignedAt: taskAssignees.assignedAt,
      assignedBy: taskAssignees.assignedBy,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
    })
      .from(taskAssignees)
      .leftJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskId))
  },

  addAssignee: async (taskId: string, userId: string, assignedBy?: string) => {
    const [assignee] = await db.insert(taskAssignees).values({
      taskId,
      userId,
      assignedBy,
    }).returning()
    return assignee
  },

  removeAssignee: async (taskId: string, userId: string) => {
    const [assignee] = await db.delete(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)))
      .returning()
    return assignee
  },

  findByBoardIdEnriched: async (boardId: string) => {
    const boardColumns = await db.select({ id: columns.id })
      .from(columns)
      .where(and(eq(columns.boardId, boardId), isNull(columns.archivedAt)))

    const columnIds = boardColumns.map(c => c.id)
    if (columnIds.length === 0) return []

    const allTasks = await db.select()
      .from(tasks)
      .where(sql`${tasks.columnId} IN ${columnIds} AND ${tasks.archivedAt} IS NULL`)
      .orderBy(asc(tasks.position))

    if (allTasks.length === 0) return []

    const taskIds = allTasks.map(t => t.id)

    // Get labels
    const taskLabelResults = await db.select({
      taskId: taskLabels.taskId,
      labelId: labels.id,
      labelName: labels.name,
      labelColor: labels.color,
    })
      .from(taskLabels)
      .innerJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(sql`${taskLabels.taskId} IN ${taskIds}`)

    // Get assignees
    const assigneeResults = await db.select({
      taskId: taskAssignees.taskId,
      userId: taskAssignees.userId,
      userName: users.name,
      userImage: users.image,
    })
      .from(taskAssignees)
      .leftJoin(users, eq(taskAssignees.userId, users.id))
      .where(sql`${taskAssignees.taskId} IN ${taskIds}`)

    // Get checklist progress
    const checklistProgress = await db.select({
      taskId: checklists.taskId,
      total: sql<number>`count(${checklistItems.id})::int`,
      completed: sql<number>`count(case when ${checklistItems.isCompleted} = true then 1 end)::int`,
    })
      .from(checklists)
      .leftJoin(checklistItems, eq(checklists.id, checklistItems.checklistId))
      .where(sql`${checklists.taskId} IN ${taskIds}`)
      .groupBy(checklists.taskId)

    // Get attachments count
    const attachmentCounts = await db.select({
      taskId: attachments.taskId,
      count: sql<number>`count(${attachments.id})::int`,
    })
      .from(attachments)
      .where(sql`${attachments.taskId} IN ${taskIds}`)
      .groupBy(attachments.taskId)

    // Build lookup maps
    const labelsMap: Record<string, { id: string; name: string; color: string }[]> = {}
    taskLabelResults.forEach(row => {
      if (!labelsMap[row.taskId]) labelsMap[row.taskId] = []
      labelsMap[row.taskId].push({ id: row.labelId, name: row.labelName, color: row.labelColor })
    })

    const assigneesMap: Record<string, { userId: string; name: string | null; image: string | null }[]> = {}
    assigneeResults.forEach(row => {
      if (!assigneesMap[row.taskId]) assigneesMap[row.taskId] = []
      assigneesMap[row.taskId].push({ userId: row.userId, name: row.userName, image: row.userImage })
    })

    const progressMap: Record<string, { completed: number; total: number }> = {}
    checklistProgress.forEach(row => {
      if (row.total > 0) {
        progressMap[row.taskId] = { completed: row.completed, total: row.total }
      }
    })

    const attachmentsMap: Record<string, number> = {}
    attachmentCounts.forEach(row => {
      attachmentsMap[row.taskId] = row.count
    })

    return allTasks.map(task => ({
      ...task,
      labels: labelsMap[task.id] || [],
      assignees: assigneesMap[task.id] || [],
      checklistProgress: progressMap[task.id] || null,
      attachmentsCount: attachmentsMap[task.id] || 0,
    }))
  },
}
