import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isBefore } from 'date-fns'
import type { BoardFilters, DueDateFilter } from '../store/boardViewStore'
import type { TaskWithLabels } from './useTasks'
import type { Column } from './useColumns'

function matchesDueDateFilter(dueDate: string | Date | null | undefined, filter: DueDateFilter): boolean {
  const now = new Date()
  const today = startOfDay(now)

  if (filter === 'no-due-date') {
    return dueDate === null || dueDate === undefined
  }

  if (!dueDate) return false

  const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate

  switch (filter) {
    case 'overdue':
      return isBefore(due, today)
    case 'due-today':
      return due >= startOfDay(now) && due <= endOfDay(now)
    case 'due-this-week':
      return due >= startOfWeek(now, { weekStartsOn: 1 }) && due <= endOfWeek(now, { weekStartsOn: 1 })
    case 'due-this-month':
      return due >= startOfMonth(now) && due <= endOfMonth(now)
    default:
      return true
  }
}

export function filterTasks(tasks: TaskWithLabels[], filters: BoardFilters, columns: Column[] = []): TaskWithLabels[] {
  const { labelIds, assigneeIds, dueDate, status } = filters

  const hasLabelFilter = labelIds.length > 0
  const hasAssigneeFilter = assigneeIds.length > 0
  const hasDueDateFilter = dueDate !== null
  const hasStatusFilter = status !== 'all'

  if (!hasLabelFilter && !hasAssigneeFilter && !hasDueDateFilter && !hasStatusFilter) {
    return tasks
  }

  const completedColumnIds = new Set(
    columns
      .filter(c => {
        const name = c.name.toLowerCase()
        return name === 'done' || name === 'completed' || name === 'finished'
      })
      .map(c => c.id)
  )

  return tasks.filter(task => {
    if (hasStatusFilter) {
      const isCompleted = 
        !!task.archivedAt ||
        completedColumnIds.has(task.columnId) ||
        (!!task.checklistProgress && 
         task.checklistProgress.total > 0 && 
         task.checklistProgress.completed === task.checklistProgress.total)

      if (status === 'active' && isCompleted) return false
      if (status === 'completed' && !isCompleted) return false
    }

    if (hasLabelFilter) {
      const taskLabelIds = (task.labels || []).map(l => l.id)
      if (!labelIds.some(id => taskLabelIds.includes(id))) {
        return false
      }
    }

    if (hasAssigneeFilter) {
      const taskAssigneeIds = (task.assignees || []).map(a => a.userId)
      if (!assigneeIds.some(id => taskAssigneeIds.includes(id))) {
        return false
      }
    }

    if (hasDueDateFilter) {
      if (!matchesDueDateFilter(task.dueDate, dueDate)) {
        return false
      }
    }

    return true
  })
}
