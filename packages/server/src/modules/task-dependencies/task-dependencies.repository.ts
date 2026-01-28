import { db } from '../../db'
import { taskDependencies, tasks, columns } from '../../db/schema'
import { eq, sql } from 'drizzle-orm'

export const taskDependencyRepository = {
  findById: async (id: string) => {
    const [dep] = await db.select().from(taskDependencies).where(eq(taskDependencies.id, id))
    return dep || null
  },

  findByTaskId: async (taskId: string) => {
    return db.select().from(taskDependencies).where(
      sql`${taskDependencies.blockingTaskId} = ${taskId} OR ${taskDependencies.blockedTaskId} = ${taskId}`
    )
  },

  findByBoardId: async (boardId: string) => {
    return db.select({
      id: taskDependencies.id,
      blockingTaskId: taskDependencies.blockingTaskId,
      blockedTaskId: taskDependencies.blockedTaskId,
      type: taskDependencies.type,
      createdAt: taskDependencies.createdAt,
    })
      .from(taskDependencies)
      .innerJoin(tasks, eq(taskDependencies.blockingTaskId, tasks.id))
      .innerJoin(columns, eq(tasks.columnId, columns.id))
      .where(eq(columns.boardId, boardId))
  },

  create: async (data: {
    blockingTaskId: string
    blockedTaskId: string
    type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish'
  }) => {
    const [dep] = await db.insert(taskDependencies).values(data).returning()
    return dep
  },

  delete: async (id: string) => {
    const [dep] = await db.delete(taskDependencies).where(eq(taskDependencies.id, id)).returning()
    return dep
  },

  hasPath: async (startId: string, endId: string): Promise<boolean> => {
    // Check if startId is same as endId (self-dependency)
    if (startId === endId) return true

    // Recursive CTE to find all reachable tasks from startId
    // We want to know if endId is reachable from startId
    // If we are adding blockingTaskId -> blockedTaskId, 
    // we must check if there is already a path from blockedTaskId back to blockingTaskId.
    // So startId would be blockedTaskId, endId would be blockingTaskId.
    
    const query = sql`
      WITH RECURSIVE reachable AS (
        SELECT blocked_task_id
        FROM task_dependencies
        WHERE blocking_task_id = ${startId}
        UNION
        SELECT td.blocked_task_id
        FROM task_dependencies td
        INNER JOIN reachable r ON td.blocking_task_id = r.blocked_task_id
      )
      SELECT 1 FROM reachable WHERE blocked_task_id = ${endId} LIMIT 1
    `
    const result = await db.execute(query)
    return result.length > 0
  }
}
