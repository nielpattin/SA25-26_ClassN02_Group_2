import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type Column = {
  id: string
  name: string
  position: string
  boardId: string
}

export type CreateColumnInput = {
  name: string
  boardId: string
}

export type MoveColumnInput = {
  beforeColumnId?: string
  afterColumnId?: string
}

// Query key factory
export const columnKeys = {
  all: ['columns'] as const,
  lists: () => [...columnKeys.all, 'list'] as const,
  list: (boardId: string) => [...columnKeys.lists(), boardId] as const,
  details: () => [...columnKeys.all, 'detail'] as const,
  detail: (id: string) => [...columnKeys.details(), id] as const,
}

/**
 * Fetch all columns for a board, sorted by position
 */
export function useColumns(boardId: string) {
  return useQuery({
    queryKey: columnKeys.list(boardId),
    queryFn: async () => {
      const { data, error } = await api.v1.columns.board({ boardId }).get()
      if (error) throw error
      return ((data || []) as Column[]).sort((a, b) => {
        if (a.position !== b.position) return a.position < b.position ? -1 : 1
        return a.id.localeCompare(b.id)
      })
    },
    enabled: !!boardId,
  })
}

/**
 * Create a new column
 */
export function useCreateColumn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateColumnInput) => {
      const { data, error } = await api.v1.columns.post(input)
      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(variables.boardId) })
    },
  })
}

/**
 * Rename a column
 */
export function useRenameColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ columnId, name }: { columnId: string; name: string }) => {
      const { error } = await api.v1.columns({ id: columnId }).patch({ name })
      if (error) throw error
    },
    onMutate: async ({ columnId, name }) => {
      await queryClient.cancelQueries({ queryKey: columnKeys.list(boardId) })
      
      const previousColumns = queryClient.getQueryData<Column[]>(columnKeys.list(boardId))
      
      if (previousColumns) {
        queryClient.setQueryData<Column[]>(columnKeys.list(boardId), prev =>
          prev?.map(col => (col.id === columnId ? { ...col, name } : col))
        )
      }
      
      return { previousColumns }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(columnKeys.list(boardId), context.previousColumns)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
    },
  })
}

/**
 * Move a column (reorder) with optimistic updates
 */
export function useMoveColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ columnId, ...moveInput }: MoveColumnInput & { columnId: string }) => {
      const { error } = await api.v1.columns({ id: columnId }).move.patch(moveInput)
      if (error) throw error
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
    },
  })
}

/**
 * Archive a column
 */
export function useArchiveColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (columnId: string) => {
      const { error } = await api.v1.columns({ id: columnId }).archive.post()
      if (error) throw error
    },
    onMutate: async (columnId) => {
      await queryClient.cancelQueries({ queryKey: columnKeys.list(boardId) })
      
      const previousColumns = queryClient.getQueryData<Column[]>(columnKeys.list(boardId))
      
      if (previousColumns) {
        queryClient.setQueryData<Column[]>(
          columnKeys.list(boardId),
          prev => prev?.filter(c => c.id !== columnId)
        )
      }
      
      return { previousColumns }
    },
    onError: (_err, _columnId, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(columnKeys.list(boardId), context.previousColumns)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
    },
  })
}

/**
 * Copy a column
 */
export function useCopyColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (columnId: string) => {
      const { error } = await api.v1.columns({ id: columnId }).copy.post()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
      // Also invalidate tasks since the copy includes tasks
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    },
  })
}

/**
 * Move a column to a different board
 */
export function useMoveColumnToBoard(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ columnId, targetBoardId }: { columnId: string; targetBoardId: string }) => {
      const { error } = await api.v1.columns({ id: columnId })['move-to-board'].patch({ targetBoardId })
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
      queryClient.invalidateQueries({ queryKey: columnKeys.list(variables.targetBoardId) })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
      queryClient.invalidateQueries({ queryKey: ['cards', variables.targetBoardId] })
    },
  })
}
