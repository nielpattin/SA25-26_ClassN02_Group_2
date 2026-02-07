import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { useSession } from '../api/auth'
import { adminKeys } from './useAdmin'

export type Template = {
  id: string
  name: string
  description: string | null
  categories: string[] | null
  columnDefinitions: { 
    name: string 
    position: string
    tasks?: {
      title: string
      description?: string
      priority?: string
      size?: string
      labelNames?: string[]
      checklists?: {
        title: string
        items: {
          content: string
          isCompleted: boolean
        }[]
      }[]
    }[]
  }[]
  defaultLabels: { name: string; color: string }[] | null
  status: 'none' | 'pending' | 'approved' | 'rejected'
  createdAt: string
  approvedAt?: string | null
  submittedAt?: string | null
  rejectionReason?: string | null
  rejectionComment?: string | null
  takedownRequestedAt?: string | null
  takedownAt?: string | null
  author: {
    id: string
    name: string
    image: string | null
  } | null
}

export type MarketplaceQuery = {
  q?: string
  category?: string
  sort?: 'newest' | 'popular' | 'alphabetical'
  limit?: number
  offset?: number
}

export const templateKeys = {
  all: ['templates'] as const,
  marketplace: (query: MarketplaceQuery) => [...templateKeys.all, 'marketplace', query] as const,
  submissions: () => [...templateKeys.all, 'submissions'] as const,
  detail: (id: string) => [...templateKeys.all, 'detail', id] as const,
  boardTemplate: (id: string) => [...templateKeys.all, 'board', id] as const,
}

export function useMarketplaceTemplates(query: MarketplaceQuery) {
  return useQuery({
    queryKey: templateKeys.marketplace(query),
    queryFn: async () => {
      const { data, error } = await api.v1.templates.marketplace.get({
        query: {
          q: query.q,
          category: query.category,
          sort: query.sort,
          limit: query.limit,
          offset: query.offset,
        }
      })
      if (error) throw error
      return data
    },
  })
}

export function useMarketplaceTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.v1.templates.marketplace({ id }).get()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCloneTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, workspaceId, boardName }: { id: string; workspaceId: string; boardName?: string }) => {
      const { data, error } = await api.v1.templates.marketplace({ id }).clone.post({
        workspaceId,
        boardName,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
    }
  })
}

export function useSubmitTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (body: { boardId?: string; templateId?: string; categories?: string[] }) => {
      const { data, error } = await api.v1.templates.marketplace.submit.post(body)
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    }
  })
}

export function usePendingSubmissions() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: templateKeys.submissions(),
    queryFn: async () => {
      const { data, error } = await api.v1.templates.marketplace.submissions.get()
      if (error) throw error
      return data
    },
    enabled: !!session?.user?.id,
  })
}

export function useApproveTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.v1.templates.marketplace({ id }).approve.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    }
  })
}

export function useRejectTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, reason, comment }: { id: string; reason?: string; comment?: string }) => {
      const { data, error } = await api.v1.templates.marketplace({ id }).reject.post({
        reason,
        comment,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    }
  })
}

export type TakedownRequest = {
  id: string
  name: string
  description: string | null
  categories: string[] | null
  status: 'none' | 'pending' | 'approved' | 'rejected'
  takedownRequestedAt: string
  takedownAt: string
  author: {
    id: string
    name: string
    image: string | null
  } | null
}

export function useTakedownRequests() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: [...templateKeys.all, 'takedowns'],
    queryFn: async () => {
      const { data, error } = await api.v1.templates.marketplace.takedowns.get()
      if (error) throw error
      return data
    },
    enabled: !!session?.user?.id,
  })
}

export function useRemoveTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.v1.templates.marketplace({ id }).remove.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
      queryClient.invalidateQueries({ queryKey: adminKeys.all })
    }
  })
}

// Hook to fetch a board template by ID (for authors to view their own templates with full details)
export function useBoardTemplate(id: string) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: templateKeys.boardTemplate(id),
    queryFn: async () => {
      const { data, error } = await api.v1.templates.boards({ id }).get()
      if (error) throw error
      return data
    },
    enabled: !!session?.user?.id && !!id,
  })
}

export function useRequestTakedown() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.v1.templates.marketplace({ id }).takedown.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    }
  })
}
