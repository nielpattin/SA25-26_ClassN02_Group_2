import { activityRepository } from './activities.repository'
import type { CreateActivityInputType } from './activities.model'

export const activityService = {
  getByBoardId: (boardId: string, limit?: number) => activityRepository.findByBoardId(boardId, limit),

  getByTaskId: (taskId: string, limit?: number) => activityRepository.findByTaskId(taskId, limit),

  log: (data: CreateActivityInputType) => activityRepository.create(data),
}
