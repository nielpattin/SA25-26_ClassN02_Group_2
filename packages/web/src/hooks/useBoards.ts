import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useWorkspace } from '../context/WorkspaceContext'

export type Board = {
  id: string
  name: string
  description: string | null
  workspaceId: string | null
  ownerId: string | null
  visibility: 'private' | 'workspace' | 'public'
  position: string
  version: number
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type CreateBoardInput = {
  name: string
  workspaceId?: string // Optional - uses current workspace if not provided
}

// Query key factory for consistent key usage
export const boardKeys = {
  all: ['boards'] as const,
  lists: () => [...boardKeys.all, 'list'] as const,
  list: (workspaceId: string | undefined) => [...boardKeys.lists(), workspaceId] as const,
  details: () => [...boardKeys.all, 'detail'] as const,
  detail: (id: string) => [...boardKeys.details(), id] as const,
}

/**
 * Hook to fetch all boards for the current workspace
 */
export function useBoards() {
  const { currentWorkspace } = useWorkspace()

  return useQuery({
    queryKey: boardKeys.list(currentWorkspace?.id),
    queryFn: async () => {
      if (!currentWorkspace?.id) return []

      const { data, error } = await api.v1.workspaces({ id: currentWorkspace.id }).boards.get()
      if (error) throw error
      return data as Board[]
    },
    enabled: !!currentWorkspace?.id,
  })
}

/**
 * Hook to fetch a single board by ID
 */
export function useBoard(boardId: string) {
  return useQuery({
    queryKey: boardKeys.detail(boardId),
    queryFn: async () => {
      const { data, error } = await api.v1.boards({ id: boardId }).get()
      if (error) throw error
      return data as Board
    },
    enabled: !!boardId,
  })
}

/**
 * Hook to create a new board with optimistic updates
 */
export function useCreateBoard() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      const workspaceId = input.workspaceId ?? currentWorkspace?.id
      if (!workspaceId) throw new Error('No workspace selected')

      const { data, error } = await api.v1.boards.post({
        name: input.name,
        workspaceId,
      })
      if (error) throw error
      return data as Board
    },
    onMutate: async (input) => {
      const workspaceId = input.workspaceId ?? currentWorkspace?.id

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: boardKeys.list(workspaceId) })

      // Snapshot previous value
      const previousBoards = queryClient.getQueryData<Board[]>(boardKeys.list(workspaceId))

      // Optimistically add new board
      if (previousBoards && workspaceId) {
        const optimisticBoard: Board = {
          id: `temp-${Date.now()}`,
          name: input.name,
          description: null,
          workspaceId,
          ownerId: null,
          visibility: 'private',
          position: 'z',
          version: 1,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        queryClient.setQueryData<Board[]>(boardKeys.list(workspaceId), [
          ...previousBoards,
          optimisticBoard,
        ])
      }

      return { previousBoards, workspaceId }
    },
    onError: (_err, _input, context) => {
      // Rollback on error
      if (context?.previousBoards && context.workspaceId) {
        queryClient.setQueryData(boardKeys.list(context.workspaceId), context.previousBoards)
      }
    },
    onSettled: (_data, _error, _input, context) => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: boardKeys.list(context?.workspaceId) })
    },
  })
}

/**
 * Hook to delete a board with optimistic updates
 */
export function useDeleteBoard() {
  const queryClient = useQueryClient()
  const { currentWorkspace } = useWorkspace()

  return useMutation({
    mutationFn: async (boardId: string) => {
      const { data, error } = await api.v1.boards({ id: boardId }).delete()
      if (error) throw error
      return data
    },
    onMutate: async (boardId) => {
      const workspaceId = currentWorkspace?.id

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: boardKeys.list(workspaceId) })

      // Snapshot previous value
      const previousBoards = queryClient.getQueryData<Board[]>(boardKeys.list(workspaceId))

      // Optimistically remove board
      if (previousBoards) {
        queryClient.setQueryData<Board[]>(
          boardKeys.list(workspaceId),
          previousBoards.filter(board => board.id !== boardId)
        )
      }

      return { previousBoards, workspaceId }
    },
    onError: (_err, _boardId, context) => {
      // Rollback on error
      if (context?.previousBoards) {
        queryClient.setQueryData(boardKeys.list(context.workspaceId), context.previousBoards)
      }
    },
    onSettled: (_data, _error, _boardId, context) => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: boardKeys.list(context?.workspaceId) })
      // Also invalidate the detail query
      queryClient.invalidateQueries({ queryKey: boardKeys.details() })
    },
  })
}
