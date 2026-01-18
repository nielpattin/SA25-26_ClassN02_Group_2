import { activityRepository } from './activities.repository'
import type { CreateActivityInputType } from './activities.model'

export const activityService = {
  getByBoardId: (boardId: string, limit?: number) => activityRepository.findByBoardId(boardId, limit),

  getByTaskId: (taskId: string, limit?: number) => activityRepository.findByTaskId(taskId, limit),

  log: async (data: CreateActivityInputType) => {
    try {
      return await activityRepository.create(data)
    } catch (error) {
      const err = error as { errno?: string; cause?: { errno?: string } }
      if (err.errno === '23503' || err.cause?.errno === '23503') return null
      throw error
    }
  },
}
