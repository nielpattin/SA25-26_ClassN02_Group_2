import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isBefore } from 'date-fns'
import type { BoardFilters, DueDateFilter } from './useBoardFilters'
import type { TaskWithLabels } from './useTasks'

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

export function filterTasks(tasks: TaskWithLabels[], filters: BoardFilters): TaskWithLabels[] {
  const { labelIds, assigneeIds, dueDate } = filters

  const hasLabelFilter = labelIds.length > 0
  const hasAssigneeFilter = assigneeIds.length > 0
  const hasDueDateFilter = dueDate !== null

  if (!hasLabelFilter && !hasAssigneeFilter && !hasDueDateFilter) {
    return tasks
  }

  return tasks.filter(task => {
    // AND logic across categories - must match ALL active filter types

    // Label filter (OR within): task matches if has ANY selected label
    if (hasLabelFilter) {
      const taskLabelIds = (task.labels || []).map(l => l.id)
      const hasMatchingLabel = labelIds.some(id => taskLabelIds.includes(id))
      if (!hasMatchingLabel) return false
    }

    // Assignee filter (OR within): task matches if has ANY selected assignee
    if (hasAssigneeFilter) {
      const taskAssigneeIds = (task.assignees || []).map(a => a.userId)

      // Special case: 'unassigned' means task has no assignees
      const wantsUnassigned = assigneeIds.includes('unassigned')
      const otherAssigneeIds = assigneeIds.filter(id => id !== 'unassigned')

      const isUnassigned = taskAssigneeIds.length === 0
      const hasMatchingAssignee = otherAssigneeIds.some(id => taskAssigneeIds.includes(id))

      if (wantsUnassigned && isUnassigned) {
        // Matches the "unassigned" filter
      } else if (hasMatchingAssignee) {
        // Matches one of the selected assignees
      } else {
        return false
      }
    }

    // Due date filter: single preset match
    if (hasDueDateFilter) {
      if (!matchesDueDateFilter(task.dueDate, dueDate)) return false
    }

    return true
  })
}
