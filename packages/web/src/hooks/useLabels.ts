import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type Label = {
  id: string
  name: string
  color: string
}

export type CreateLabelInput = {
  name: string
  color: string
  boardId: string
}

export type UpdateLabelInput = {
  id: string
  name?: string
  color?: string
}

export const labelKeys = {
  all: ['labels'] as const,
  board: (boardId: string) => [...labelKeys.all, 'board', boardId] as const,
}

export function useLabels(boardId: string) {
  return useQuery({
    queryKey: labelKeys.board(boardId),
    queryFn: async () => {
      const { data, error } = await api.v1.labels.board({ boardId }).get()
      if (error) throw error
      return data ?? []
    },
    enabled: !!boardId,
  })
}

export function useCreateLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLabelInput) => {
      const { data, error } = await api.v1.labels.post(input)
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: labelKeys.board(variables.boardId) })
    },
  })
}

export function useUpdateLabel(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateLabelInput) => {
      const { data, error } = await api.v1.labels({ id }).patch(updates)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.board(boardId) })
      // We might need to invalidate tasks if label content changed
      queryClient.invalidateQueries({ queryKey: ['card'] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}

export function useDeleteLabel(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.v1.labels({ id }).delete()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelKeys.board(boardId) })
      queryClient.invalidateQueries({ queryKey: ['card'] })
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    },
  })
}

export function useToggleLabel(taskId: string, boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ labelId, isCurrentlyActive }: { labelId: string; isCurrentlyActive: boolean }) => {
      if (isCurrentlyActive) {
        const { error } = await api.v1.labels.card({ cardId: taskId }).label({ labelId }).delete()
        if (error) throw error
      } else {
        const { error } = await api.v1.labels.card({ cardId: taskId }).label({ labelId }).post()
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', taskId] })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['activities', taskId] })
    },
  })
}
