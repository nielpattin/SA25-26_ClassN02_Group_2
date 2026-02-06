import { activityRepository } from './activities.repository'
import { boardRepository } from '../boards/boards.repository'
import { ForbiddenError, BadRequestError, NotFoundError } from '../../shared/errors'
import type { CreateActivityInputType, ActivityExportRow } from './activities.model'

const MAX_EXPORT_DAYS = 365

// CSV escape helper - handles commas, quotes, and newlines
const escapeCsv = (val: unknown): string => {
  if (val === null || val === undefined) return ''
  let str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export const activityService = {
  getByBoardId: async (boardId: string, userId: string, limit?: number) => {
    // Verify user has access to this board
    const { boardService } = await import('../boards/boards.service')
    const hasAccess = await boardService.canAccessBoard(boardId, userId)
    if (!hasAccess) {
      throw new ForbiddenError('Access denied')
    }
    
    return activityRepository.findByBoardId(boardId, limit)
  },

  getByTaskId: async (taskId: string, userId: string, limit = 10, cursor?: string) => {
    // Verify user has access to the board this task belongs to
    const { taskRepository } = await import('../tasks/tasks.repository')
    const { boardService } = await import('../boards/boards.service')
    
    const boardId = await taskRepository.getBoardIdFromTask(taskId)
    if (boardId) {
      const hasAccess = await boardService.canAccessBoard(boardId, userId)
      if (!hasAccess) {
        throw new ForbiddenError('Access denied')
      }
    }
    
    const items = await activityRepository.findByTaskId(taskId, limit + 1, cursor)
    const hasMore = items.length > limit
    const data = hasMore ? items.slice(0, limit) : items
    const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].createdAt.toISOString() : null

    return { items: data, nextCursor, hasMore }
  },

  log: async (data: CreateActivityInputType) => {
    try {
      return await activityRepository.create(data)
    } catch (error) {
      const err = error as { errno?: string; cause?: { errno?: string } }
      if (err.errno === '23503' || err.cause?.errno === '23503') return null
      throw error
    }
  },

  exportBoardActivities: async (
    boardId: string,
    userId: string,
    dateFrom: string,
    dateTo: string,
    format: 'json' | 'csv' = 'json'
  ) => {
    // Validate board exists
    const board = await boardRepository.findById(boardId)
    if (!board) {
      throw new NotFoundError('Board not found')
    }

    // Check if user is board admin
    const members = await boardRepository.getMembers(boardId)
    const userMembership = members.find(m => m.userId === userId)
    if (!userMembership || userMembership.role !== 'admin') {
      throw new ForbiddenError('Only board admins can export activities')
    }

    // Parse and validate dates
    const fromDate = new Date(dateFrom)
    const toDate = new Date(dateTo)

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestError('Invalid date format')
    }

    // Validate dateFrom is not after dateTo
    if (fromDate > toDate) {
      throw new BadRequestError('dateFrom cannot be after dateTo')
    }

    // Validate date range is not over 365 days
    const diffTime = toDate.getTime() - fromDate.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)
    if (diffDays > MAX_EXPORT_DAYS) {
      throw new BadRequestError('Date range cannot exceed 365 days')
    }

    // Format filename
    const baseFileName = board.name.replace(/\s+/g, '-').toLowerCase()
    const fromStr = dateFrom
    const toStr = dateTo
    const filename = `${baseFileName}-activities-${fromStr}-to-${toStr}.${format}`

    if (format === 'csv') {
      // Use streaming for CSV to handle large exports
      const stream = new ReadableStream({
        async start(controller) {
          // Write BOM for Excel compatibility
          controller.enqueue(new TextEncoder().encode('\uFEFF'))

          // Write header
          const headers = ['id', 'boardId', 'taskId', 'userId', 'userName', 'action', 'targetType', 'targetId', 'changes', 'createdAt']
          controller.enqueue(new TextEncoder().encode(headers.join(',') + '\n'))

          // Stream rows in batches
          const activityStream = activityRepository.streamByBoardIdInRange(boardId, fromDate, toDate)

          for await (const a of activityStream) {
            const row = [
              a.id,
              a.boardId,
              a.taskId ?? '',
              a.userId,
              a.userName ?? '',
              a.action,
              a.targetType,
              a.targetId,
              escapeCsv(JSON.stringify(a.changes)),
              a.createdAt.toISOString(),
            ].map(escapeCsv).join(',')

            controller.enqueue(new TextEncoder().encode(row + '\n'))
          }

          controller.close()
        }
      })

      return {
        stream,
        filename,
        contentType: 'text/csv',
      }
    }

    // JSON format - also streaming for consistency with large exports
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode('[\n'))

        const activityStream = activityRepository.streamByBoardIdInRange(boardId, fromDate, toDate)
        let isFirst = true

        for await (const a of activityStream) {
          const formatted: ActivityExportRow = {
            id: a.id,
            boardId: a.boardId,
            taskId: a.taskId,
            userId: a.userId,
            userName: a.userName,
            action: a.action,
            targetType: a.targetType,
            targetId: a.targetId,
            changes: a.changes,
            createdAt: a.createdAt.toISOString(),
          }

          const prefix = isFirst ? '' : ',\n'
          isFirst = false

          controller.enqueue(new TextEncoder().encode(prefix + JSON.stringify(formatted)))
        }

        controller.enqueue(new TextEncoder().encode('\n]'))
        controller.close()
      }
    })

    return {
      stream,
      filename,
      contentType: 'application/json',
    }
  },
}
