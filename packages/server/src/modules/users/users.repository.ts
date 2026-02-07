import { db } from '../../db'
import { users, sessions, accounts, members, workspaces, boards, columns, tasks, labels, comments, checklists, checklistItems, attachments, taskLabels } from '../../db/schema'
import { eq, and, ne, inArray } from 'drizzle-orm'
import { DEFAULT_NOTIFICATION_PREFERENCES } from './users.model'
import type { CreateUserInput, UpdateUserInput, UpdateUserPreferencesInput, UpdateNotificationPreferencesInput } from './users.model'

export const userRepository = {
  async getAll() {
    return db.select().from(users)
  },

  async getById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id))
    return user
  },

  async getByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email))
    return user
  },

  async getPasswordHash(userId: string) {
    const [account] = await db.select().from(accounts).where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.providerId, 'credential')
      )
    )
    return account?.password
  },

  async create(data: CreateUserInput) {
    const [user] = await db.insert(users).values({
      id: data.id || crypto.randomUUID(),
      name: data.name,
      email: data.email,
      image: data.image,
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    }).returning()
    return user
  },

  async update(id: string, data: UpdateUserInput) {
    const [user] = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return user
  },

  async updatePreferences(id: string, data: UpdateUserPreferencesInput) {
    const [user] = await db.update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return user
  },

  async updateNotificationPreferences(id: string, data: UpdateNotificationPreferencesInput) {
    const user = await this.getById(id)
    if (!user) return null

    const currentPrefs = user.notificationPreferences as Record<string, unknown>
    // Merge current prefs with defaults to ensure all keys exist
    const newPrefs: Record<string, unknown> = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...currentPrefs }

    for (const key in data) {
      if (data[key as keyof typeof data]) {
        const existingKeyPrefs = (newPrefs[key] as Record<string, unknown>) || {}
        newPrefs[key] = {
          ...existingKeyPrefs,
          ...data[key as keyof typeof data]
        }
      }
    }

    const [updatedUser] = await db.update(users)
      .set({
        notificationPreferences: newPrefs,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return updatedUser
  },

  async delete(id: string) {
    // Soft delete
    const [user] = await db.update(users)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return user
  },

  async restore(id: string) {
    const [user] = await db.update(users)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning()
    return user
  },

  async getExportData(userId: string) {
    const user = await this.getById(userId)
    if (!user) return null

    // Fetch workspaces where user is a member
    const userMemberships = await db.select()
      .from(members)
      .where(eq(members.userId, userId))
    
    const workspaceIds = userMemberships.map(m => m.workspaceId)
    
    let userWorkspaces: any[] = []
    let userBoards: any[] = []
    let userColumns: any[] = []
    let userTasks: any[] = []
    let userLabels: any[] = []
    let userTaskLabels: any[] = []
    let userComments: any[] = []
    let userChecklists: any[] = []
    let userChecklistItems: any[] = []
    let userAttachments: any[] = []

    if (workspaceIds.length > 0) {
      userWorkspaces = await db.select()
        .from(workspaces)
        .where(inArray(workspaces.id, workspaceIds))

      userBoards = await db.select()
        .from(boards)
        .where(inArray(boards.workspaceId, workspaceIds))
      
      const boardIds = userBoards.map(b => b.id)

      if (boardIds.length > 0) {
        userColumns = await db.select()
          .from(columns)
          .where(inArray(columns.boardId, boardIds))
        
        userLabels = await db.select()
          .from(labels)
          .where(inArray(labels.boardId, boardIds))
        
        const columnIds = userColumns.map(c => c.id)
        
        if (columnIds.length > 0) {
          userTasks = await db.select()
            .from(tasks)
            .where(inArray(tasks.columnId, columnIds))
          
          const taskIds = userTasks.map(t => t.id)
          
          if (taskIds.length > 0) {
            userTaskLabels = await db.select()
              .from(taskLabels)
              .where(inArray(taskLabels.taskId, taskIds))
            
            userComments = await db.select()
              .from(comments)
              .where(inArray(comments.taskId, taskIds))
            
            userChecklists = await db.select()
              .from(checklists)
              .where(inArray(checklists.taskId, taskIds))
            
            userAttachments = await db.select()
              .from(attachments)
              .where(inArray(attachments.taskId, taskIds))
            
            const checklistIds = userChecklists.map(c => c.id)
            if (checklistIds.length > 0) {
              userChecklistItems = await db.select()
                .from(checklistItems)
                .where(inArray(checklistItems.checklistId, checklistIds))
            }
          }
        }
      }
    }

    return {
      user,
      workspaces: userWorkspaces,
      memberships: userMemberships,
      boards: userBoards,
      columns: userColumns,
      tasks: userTasks,
      labels: userLabels,
      taskLabels: userTaskLabels,
      comments: userComments,
      checklists: userChecklists,
      checklistItems: userChecklistItems,
      attachments: userAttachments
    }
  },

  async getSessions(userId: string) {
    return db.select().from(sessions).where(eq(sessions.userId, userId))
  },

  async deleteSession(userId: string, sessionId: string) {
    return db.delete(sessions).where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.id, sessionId)
      )
    ).returning()
  },

  async deleteAllSessionsExcept(userId: string, currentSessionId: string) {
    return db.delete(sessions).where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.id, currentSessionId)
      )
    ).returning()
  },

  async deleteAllSessions(userId: string) {
    return db.delete(sessions).where(eq(sessions.userId, userId)).returning()
  },
}
