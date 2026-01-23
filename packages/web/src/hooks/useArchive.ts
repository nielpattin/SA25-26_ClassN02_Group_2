import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { boardKeys } from './useBoards'
import { columnKeys } from './useColumns'
import { taskKeys } from './useTasks'

export const archiveKeys = {
  all: ['archive'] as const,
  boards: (workspaceId: string | undefined) => [...archiveKeys.all, 'boards', workspaceId] as const,
  boardItems: (boardId: string) => [...archiveKeys.all, 'items', boardId] as const,
}

export type ArchivedBoard = {
  id: string
  name: string
  archivedAt: string | null
}

export type ArchivedColumn = {
  id: string
  name: string
  archivedAt: string | null
  boardId: string
  tasksCount?: number
}

export type ArchivedTask = {
  id: string
  title: string
  archivedAt: string | null
  columnName?: string
}

export type BoardArchive = {
  columns: ArchivedColumn[]
  tasks: ArchivedTask[]
}

/**
 * Hook to fetch archived boards for a workspace
 */
export function useArchivedBoards(workspaceId: string | undefined) {
  return useQuery({
    queryKey: archiveKeys.boards(workspaceId),
    queryFn: async () => {
      if (!workspaceId) return []
      const { data, error } = await api.v1.workspaces({ id: workspaceId })['archived-boards'].get()
      if (error) throw error
      return data as ArchivedBoard[]
    },
    enabled: !!workspaceId,
  })
}

/**
 * Hook to fetch archived items (columns and tasks) for a board
 */
export function useBoardArchive(boardId: string) {
  return useQuery({
    queryKey: archiveKeys.boardItems(boardId),
    queryFn: async () => {
      const { data, error } = await api.v1.boards({ id: boardId }).archived.get()
      if (error) throw error
      return data as BoardArchive
    },
    enabled: !!boardId,
  })
}

/**
 * Restore an archived board
 */
export function useRestoreBoard(workspaceId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (boardId: string) => {
      const { data, error } = await api.v1.boards({ id: boardId }).restore.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: archiveKeys.boards(workspaceId) })
      queryClient.invalidateQueries({ queryKey: boardKeys.list(workspaceId) })
    },
  })
}

/**
 * Permanently delete an archived board
 */
export function usePermanentDeleteBoard(workspaceId?: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (boardId: string) => {
      const { data, error } = await api.v1.boards({ id: boardId }).permanent.delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: archiveKeys.boards(workspaceId) })
    },
  })
}

/**
 * Restore an archived column (and its tasks)
 */
export function useRestoreColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (columnId: string) => {
      const { data, error } = await api.v1.columns({ id: columnId }).restore.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: archiveKeys.boardItems(boardId) })
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
    },
  })
}

/**
 * Permanently delete an archived column
 */
export function usePermanentDeleteColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (columnId: string) => {
      const { data, error } = await api.v1.columns({ id: columnId }).permanent.delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: archiveKeys.boardItems(boardId) })
    },
  })
}

/**
 * Restore an archived task
 */
export function useRestoreTask(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await api.v1.tasks({ id: taskId }).restore.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: archiveKeys.boardItems(boardId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.list(boardId) })
    },
  })
}

/**
 * Permanently delete an archived task
 */
export function usePermanentDeleteTask(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await api.v1.tasks({ id: taskId }).permanent.delete()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: archiveKeys.boardItems(boardId) })
    },
  })
}
