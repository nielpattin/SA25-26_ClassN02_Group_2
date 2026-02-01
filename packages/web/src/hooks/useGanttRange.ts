import { useMemo } from 'react'
import {
  startOfDay,
  addDays,
  subDays,
  isBefore,
  isAfter,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  eachMonthOfInterval,
  max,
  min,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import type { TaskWithLabels } from './useTasks'

export function useGanttRange(tasks: TaskWithLabels[]) {
  return useMemo(() => {
    const today = startOfDay(new Date())
    
    const datedTasks = tasks.filter(t => t.startDate || t.dueDate)
    
    let start: Date
    let end: Date

    if (datedTasks.length === 0) {
      start = startOfMonth(today)
      end = endOfMonth(today)
    } else {
      const dates = datedTasks.flatMap(t => {
        const d = []
        if (t.startDate) d.push(new Date(t.startDate))
        if (t.dueDate) d.push(new Date(t.dueDate))
        return d
      })
      
      start = min(dates)
      end = max(dates)
      
      // Include today
      if (isBefore(today, start)) start = today
      if (isAfter(today, end)) end = today
      
      // Add ±1 week buffer
      start = subDays(start, 7)
      end = addDays(end, 7)
    }

    // Align to week boundaries for better grid rendering
    start = startOfWeek(start, { weekStartsOn: 1 })
    end = endOfWeek(end, { weekStartsOn: 1 })

    // Cap at 2 years
    const totalDays = differenceInDays(end, start)
    if (totalDays > 730) {
      end = addDays(start, 730)
    }

    const days = eachDayOfInterval({ start, end })
    const months = eachMonthOfInterval({ start, end }).map(monthStart => ({
      start: monthStart,
      end: endOfMonth(monthStart),
      days: eachDayOfInterval({
        start: max([monthStart, start]),
        end: min([endOfMonth(monthStart), end])
      })
    }))

    return {
      start,
      end,
      days,
      months,
      totalDays: days.length
    }
  }, [tasks])
}
