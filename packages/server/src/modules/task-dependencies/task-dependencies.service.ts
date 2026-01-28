import { taskDependencyRepository } from './task-dependencies.repository'
import { taskRepository } from '../tasks/tasks.repository'
import { eventBus } from '../../events/bus'
import { BadRequestError, NotFoundError } from '../../shared/errors'

export const taskDependencyService = {
  getById: (id: string) => taskDependencyRepository.findById(id),

  getByTaskId: (taskId: string) => taskDependencyRepository.findByTaskId(taskId),

  getByBoardId: (boardId: string) => taskDependencyRepository.findByBoardId(boardId),

  create: async (data: {
    blockingTaskId: string
    blockedTaskId: string
    type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish'
  }, userId: string) => {
    if (data.blockingTaskId === data.blockedTaskId) {
      throw new BadRequestError('A task cannot depend on itself')
    }

    // Check if tasks exist
    const [blocking, blocked] = await Promise.all([
      taskRepository.findById(data.blockingTaskId),
      taskRepository.findById(data.blockedTaskId),
    ])

    if (!blocking || !blocked) {
      throw new NotFoundError('One or both tasks not found')
    }

    // Check for circular dependency
    // Adding blocking -> blocked
    // Path blocked -> blocking must NOT exist
    const wouldCreateCycle = await taskDependencyRepository.hasPath(data.blockedTaskId, data.blockingTaskId)
    if (wouldCreateCycle) {
      throw new BadRequestError('Circular dependency detected')
    }

    const dep = await taskDependencyRepository.create(data)
    
    const boardId = await taskRepository.getBoardIdFromTask(data.blockingTaskId)
    if (boardId) {
      eventBus.emitDomain('task.dependency.created', { dependency: dep, userId, boardId })
    }

    return dep
  },

  delete: async (id: string, userId: string) => {
    const dep = await taskDependencyRepository.findById(id)
    if (!dep) throw new NotFoundError('Dependency not found')

    const deletedDep = await taskDependencyRepository.delete(id)
    const boardId = await taskRepository.getBoardIdFromTask(dep.blockingTaskId)
    
    if (boardId) {
      eventBus.emitDomain('task.dependency.deleted', { dependency: deletedDep, userId, boardId })
    }

    return deletedDep
  }
}
