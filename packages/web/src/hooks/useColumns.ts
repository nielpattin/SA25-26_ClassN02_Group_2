import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useDragStore } from '../store/dragStore'

export type Column = {
  id: string
  name: string
  position: string
  boardId: string
  version?: number
}

export type CreateColumnInput = {
  name: string
  boardId: string
}

export type MoveColumnInput = {
  position: string
  version?: number
}

export const columnKeys = {
  all: ['columns'] as const,
  lists: () => [...columnKeys.all, 'list'] as const,
  list: (boardId: string) => [...columnKeys.lists(), boardId] as const,
  details: () => [...columnKeys.all, 'detail'] as const,
  detail: (id: string) => [...columnKeys.details(), id] as const,
}

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

export function useRenameColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ columnId, name }: { columnId: string, name: string }) => {
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

export function useMoveColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ columnId, ...moveInput }: MoveColumnInput & { columnId: string }) => {
      const { error } = await api.v1.columns({ id: columnId }).move.patch(moveInput)
      if (error) throw error
    },
    onMutate: ({ columnId, position, version }) => {
      queryClient.cancelQueries({ queryKey: columnKeys.list(boardId) })

      const previousColumns = queryClient.getQueryData<Column[]>(columnKeys.list(boardId))

      if (previousColumns) {
        queryClient.setQueryData<Column[]>(columnKeys.list(boardId), prev => {
          if (!prev) return prev
          return prev
            .map(col => (col.id === columnId ? { ...col, position, version } : col))
            .sort((a, b) => {
              if (a.position !== b.position) return a.position < b.position ? -1 : 1
              return a.id.localeCompare(b.id)
            })
        })
      }

      useDragStore.getState().clearColumnDrag()

      return { previousColumns }
    },
    onError: (err, _variables, context) => {
      if (context?.previousColumns) {
        queryClient.setQueryData(columnKeys.list(boardId), context.previousColumns)
      }
      if ((err as { status?: number }).status === 409) {
        queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
    },
  })
}

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

export function useCopyColumn(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (columnId: string) => {
      const { error } = await api.v1.columns({ id: columnId }).copy.post()
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: columnKeys.list(boardId) })
      queryClient.invalidateQueries({ queryKey: ['cards', boardId] })
    },
  })
}

export function useMoveColumnToBoard(boardId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ columnId, targetBoardId }: { columnId: string, targetBoardId: string }) => {
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
