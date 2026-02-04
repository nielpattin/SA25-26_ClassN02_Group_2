import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type TaskLabel = {
  id: string
  name: string
  color: string
}

export type TaskAssignee = {
  userId: string
  name: string | null
  image: string | null
}

export type ChecklistProgress = {
  completed: number
  total: number
}

// Task type for list views (enriched endpoint returns labels as objects)
export type TaskWithLabels = {
  id: string
  title: string
  position: string
  columnId: string
  startDate: string | Date | null
  dueDate: string | Date | null
  description?: string | null
  createdAt?: Date | null
  labels?: TaskLabel[]
  assignees?: TaskAssignee[]
  checklistProgress?: ChecklistProgress | null
  attachmentsCount?: number
  reminder?: 'none' | 'on_day' | '1_day' | '2_days' | '1_week'
  archivedAt?: string | Date | null
  size?: 'xs' | 's' | 'm' | 'l' | 'xl' | null
  version?: number
}

// Task type from detail endpoint (labels as string IDs)
export type Task = {
  id: string
  title: string
  position: string
  columnId: string
  startDate: string | Date | null
  dueDate: string | Date | null
  description?: string | null
  createdAt?: Date | null
  labels?: string[]
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null
  reminder?: 'none' | 'on_day' | '1_day' | '2_days' | '1_week'
  archivedAt?: string | Date | null
}

export type CreateTaskInput = {
  title: string
  columnId: string
  startDate?: string | null
  dueDate?: string | null
  reminder?: 'none' | 'on_day' | '1_day' | '2_days' | '1_week'
}

export type UpdateTaskInput = {
  title?: string
  description?: string
  startDate?: string | null
  dueDate?: string | null
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null
  reminder?: 'none' | 'on_day' | '1_day' | '2_days' | '1_week'
}

export type MoveTaskInput = {
  columnId: string
  position: string
  version?: number
}

// Query key factory
export const taskKeys = {
  all: ['cards'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (boardId: string) => [...taskKeys.lists(), boardId] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

/**
 * Fetch all tasks for a board (enriched with labels, checklist progress)
 */
export function useTasks(boardId: string) {
  return useQuery({
    queryKey: taskKeys.list(boardId),
    queryFn: async () => {
      const { data, error } = await api.v1.tasks.board({ boardId }).enriched.get()
      if (error) throw error
      return ((data || []) as TaskWithLabels[]).sort((a, b) => {
        if (a.columnId !== b.columnId) return a.columnId.localeCompare(b.columnId)
        if (a.position !== b.position) return a.position < b.position ? -1 : 1
        return a.id.localeCompare(b.id)
      })
    },
    enabled: !!boardId,
  })
}

/**
 * Fetch a single task by ID
 */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: async () => {
      const { data, error } = await api.v1.tasks({ id: taskId }).get()
      if (error) throw error
      return data as Task
    },
    enabled: !!taskId,
  })
}

/**
 * Create a new task
 */
export function useCreateTask(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data, error } = await api.v1.tasks.post(input)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
    },
  })
}

/**
 * Update a task
 */
export function useUpdateTask(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, ...updates }: UpdateTaskInput & { taskId: string }) => {
      const { data, error } = await api.v1.tasks({ id: taskId }).patch(updates)
      if (error) throw error
      return data
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.list(boardId) })
      await queryClient.cancelQueries({ queryKey: taskKeys.detail(variables.taskId) })

      const previousTasks = queryClient.getQueryData<TaskWithLabels[]>(taskKeys.list(boardId))
      const previousTask = queryClient.getQueryData<Task>(taskKeys.detail(variables.taskId))

      if (previousTasks) {
        queryClient.setQueryData<TaskWithLabels[]>(taskKeys.list(boardId), prev =>
          prev?.map(task => task.id === variables.taskId ? { ...task, ...variables } : task)
        )
      }

      if (previousTask) {
        queryClient.setQueryData<Task>(taskKeys.detail(variables.taskId), prev =>
          prev ? { ...prev, ...variables } : prev
        )
      }

      return { previousTasks, previousTask }
    },
    onError: (_err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(boardId), context.previousTasks)
      }
      if (context?.previousTask) {
        queryClient.setQueryData(taskKeys.detail(variables.taskId), context.previousTask)
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) })
    },
  })
}

/**
 * Move a task (change column and/or position) with optimistic updates
 */
export function useMoveTask(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, ...moveInput }: MoveTaskInput & { taskId: string }) => {
      const { error } = await api.v1.tasks({ id: taskId }).move.patch(moveInput)
      if (error) throw error
    },
    onMutate: async ({ taskId, columnId, position, version }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.list(boardId) })

      const previousTasks = queryClient.getQueryData<TaskWithLabels[]>(taskKeys.list(boardId))

      if (previousTasks) {
        queryClient.setQueryData<TaskWithLabels[]>(taskKeys.list(boardId), prev => {
          if (!prev) return prev
          return prev.map(task =>
            task.id === taskId ? { ...task, columnId, position, version } : task
          )
        })
      }

      return { previousTasks }
    },
    onError: (err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(boardId), context.previousTasks)
      }
      // Retry on conflict by refetching
      if ((err as { status?: number }).status === 409) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
    },
  })
}

/**
 * Archive a task
 */
export function useArchiveTask(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await api.v1.tasks({ id: taskId }).archive.post()
      if (error) throw error
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.list(boardId) })
      
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.list(boardId))
      
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(
          taskKeys.list(boardId),
          prev => prev?.filter(t => t.id !== taskId)
        )
      }
      
      return { previousTasks }
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(boardId), context.previousTasks)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
    },
  })
}
