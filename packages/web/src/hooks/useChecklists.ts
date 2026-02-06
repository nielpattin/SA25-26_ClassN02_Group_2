import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { taskKeys } from './useTasks'
import type { Checklist } from '../components/CardModalTypes'

export const checklistKeys = {
  all: ['checklists'] as const,
  task: (taskId: string) => [...checklistKeys.all, taskId] as const,
}

export function useChecklists(taskId: string) {
  return useQuery({
    queryKey: checklistKeys.task(taskId),
    queryFn: async () => {
      const { data, error } = await api.v1.checklists.task({ taskId }).get()
      if (error) throw error
      return (data ?? []) as Checklist[]
    },
    enabled: !!taskId,
  })
}

type CreateChecklistInput = {
  title: string
  taskId: string
  boardId?: string
}

export function useCreateChecklist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ title, taskId }: CreateChecklistInput) => {
      const { data, error } = await api.v1.checklists.post({
        title,
        taskId,
      })
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.refetchQueries({ queryKey: checklistKeys.task(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: ['activities', variables.taskId] })
      if (variables.boardId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(variables.boardId) })
      }
    },
  })
}

export function useUpdateChecklist(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, title }: { id: string title: string }) => {
      const { error } = await api.v1.checklists({ id }).patch({ title })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.task(taskId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
    },
  })
}

export function useDeleteChecklist(taskId: string, boardId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.v1.checklists({ id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.task(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      }
    },
  })
}

export function useAddChecklistItem(taskId: string, boardId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ checklistId, content }: { checklistId: string content: string }) => {
      const { error } = await api.v1.checklists.items.post({
        checklistId,
        content,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.task(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      }
    },
  })
}

export function useUpdateChecklistItem(taskId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, content }: { id: string content: string }) => {
      const { error } = await api.v1.checklists.items({ id }).patch({ content })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.task(taskId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
    },
  })
}

export function useToggleChecklistItem(taskId: string, boardId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.v1.checklists.items({ id }).toggle.post()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.task(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      }
    },
  })
}

export function useDeleteChecklistItem(taskId: string, boardId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.v1.checklists.items({ id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKeys.task(taskId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
      if (boardId) {
        queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
      }
    },
  })
}
