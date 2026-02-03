import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

export type Template = {
  id: string
  name: string
  description: string | null
  categories: string[] | null
  columnDefinitions: { name: string; position: string }[]
  defaultLabels: { name: string; color: string }[] | null
  status: 'none' | 'pending' | 'approved' | 'rejected'
  createdAt: string
  approvedAt?: string | null
  submittedAt?: string | null
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
      return data as unknown as Template[]
    },
  })
}

export function useMarketplaceTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.v1.templates.marketplace({ id }).get()
      if (error) throw error
      return data as unknown as Template
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
  return useQuery({
    queryKey: templateKeys.submissions(),
    queryFn: async () => {
      const { data, error } = await api.v1.templates.marketplace.submissions.get()
      if (error) throw error
      return data as unknown as Template[]
    },
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
    }
  })
}

export function useRejectTemplate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.v1.templates.marketplace({ id }).reject.post()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all })
    }
  })
}
