import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type TaskLabel = {
  id: string
  name: string
  color: string
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
  dueDate: string | Date | null
  description?: string | null
  createdAt?: Date | null
  labels?: TaskLabel[]
  checklistProgress?: ChecklistProgress | null
  attachmentsCount?: number
}

// Task type from detail endpoint (labels as string IDs)
export type Task = {
  id: string
  title: string
  position: string
  columnId: string
  dueDate: string | Date | null
  description?: string | null
  createdAt?: Date | null
  labels?: string[]
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null
}

export type CreateTaskInput = {
  title: string
  columnId: string
}

export type UpdateTaskInput = {
  title?: string
  description?: string
  dueDate?: string | null
  priority?: 'urgent' | 'high' | 'medium' | 'low' | 'none' | null
}

export type MoveTaskInput = {
  columnId: string
  beforeTaskId?: string
  afterTaskId?: string
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
        if (a.position !== b.position) return a.position < b.position ? -1 : 1
        if (a.columnId !== b.columnId) return a.columnId.localeCompare(b.columnId)
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
    onSuccess: (_data, variables) => {
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
    onMutate: async ({ taskId, columnId }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.list(boardId) })
      
      const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.list(boardId))
      
      if (previousTasks) {
        queryClient.setQueryData<Task[]>(taskKeys.list(boardId), prev => {
          if (!prev) return prev
          return prev.map(task => 
            task.id === taskId ? { ...task, columnId } : task
          )
        })
      }
      
      return { previousTasks }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(boardId), context.previousTasks)
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
