import { db } from '../../db'
import { userBoardPreferences } from '../../db/schema'
import { and, eq } from 'drizzle-orm'

export const boardPreferenceRepository = {
  findByUserAndBoard: async (userId: string, boardId: string) => {
    const [prefs] = await db.select()
      .from(userBoardPreferences)
      .where(and(
        eq(userBoardPreferences.userId, userId),
        eq(userBoardPreferences.boardId, boardId)
      ))
    return prefs
  },

  upsert: async (userId: string, boardId: string, data: {
    view?: 'kanban' | 'calendar' | 'gantt'
    zoomMode?: 'day' | 'week' | 'month' | 'quarter'
    filters?: {
      labelIds?: string[]
      assigneeIds?: string[]
      dueDate?: string | null
      status?: 'active' | 'completed' | 'all'
    }
  }) => {
    const [prefs] = await db.insert(userBoardPreferences)
      .values({
        userId,
        boardId,
        ...data,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userBoardPreferences.userId, userBoardPreferences.boardId],
        set: {
          ...data,
          updatedAt: new Date(),
        },
      })
      .returning()
    return prefs
  },
}
