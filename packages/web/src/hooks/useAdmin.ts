import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AdminRole } from '@kyte/server/src/modules/admin/admin.model'

export type AuditFilters = {
  action?: string
  adminId?: string
  targetId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export type AdminUser = {
  id: string
  name: string
  email: string
  image?: string | null
  adminRole: AdminRole | null
  updatedAt?: string | null
}

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  users: (limit?: number, offset?: number) => [...adminKeys.all, 'users', { limit, offset }] as const,
  userSearch: (query: string, limit?: number, offset?: number) =>
    [...adminKeys.all, 'userSearch', query, { limit, offset }] as const,
  audit: (filters: AuditFilters) => [...adminKeys.all, 'audit', filters] as const,
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: async () => {
      const { data, error } = await api.v1.admin.dashboard.get()
      if (error) throw error
      return data
    },
  })
}

export function useAdminUsers(limit = 50, offset = 0) {
  return useQuery({
    queryKey: adminKeys.users(limit, offset),
    queryFn: async () => {
      const { data, error } = await api.v1.admin.users.get({
        query: {
          limit: limit.toString(),
          offset: offset.toString(),
        },
      })
      if (error) throw error
      return data
    },
  })
}

export function usePromoteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: AdminRole }) => {
      const { data, error } = await api.v1.admin.users({ id }).promote.post({ role })
      if (error) throw error
      return data
    },
    onMutate: async ({ id, role }) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.users() })
      const previousUsers = queryClient.getQueryData<AdminUser[]>(adminKeys.users())
      if (previousUsers) {
        queryClient.setQueryData(
          adminKeys.users(),
          previousUsers.map((user) => (user.id === id ? { ...user, adminRole: role } : user))
        )
      }
      return { previousUsers }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(adminKeys.users(), context.previousUsers)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
    },
  })
}

export function useDemoteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.v1.admin.users({ id }).demote.delete()
      if (error) throw error
      return data
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: adminKeys.users() })
      const previousUsers = queryClient.getQueryData<AdminUser[]>(adminKeys.users())
      if (previousUsers) {
        queryClient.setQueryData(
          adminKeys.users(),
          previousUsers.filter((user) => user.id !== id)
        )
      }
      return { previousUsers }
    },
    onError: (_err, _id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(adminKeys.users(), context.previousUsers)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() })
    },
  })
}

export function useAuditLogs(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: adminKeys.audit(filters),
    queryFn: async () => {
      const { data, error } = await api.v1.admin.audit.get({
        query: {
          ...filters,
          limit: filters.limit?.toString(),
          offset: filters.offset?.toString(),
        },
      })
      if (error) throw error
      return data
    },
  })
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.v1.admin.audit.export.get()
      if (error) throw error
      return data
    },
  })
}

export function useUserSearch(query: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: adminKeys.userSearch(query, limit, offset),
    queryFn: async () => {
      const { data, error } = await api.v1.admin.users.search.get({
        query: {
          query,
          limit: limit.toString(),
          offset: offset.toString(),
        },
      })
      if (error) throw error
      return data
    },
    enabled: query.length >= 2, // Only search when query is at least 2 characters
  })
}

export function useUserDetail(userId: string) {
  return useQuery({
    queryKey: [...adminKeys.all, 'userDetail', userId],
    queryFn: async () => {
      const { data, error } = await api.v1.admin.users({ id: userId }).get()
      if (error) throw error
      return data
    },
  })
}

export function usePasswordReset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await api.v1.admin.users({ id: userId })['password-reset'].post()
      if (error) throw error
      return data
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'userDetail', userId] })
    },
  })
}

export function useRevokeSessions() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await api.v1.admin.users({ id: userId })['revoke-sessions'].post()
      if (error) throw error
      return data
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'userDetail', userId] })
    },
  })
}

export function useCancelDeletion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await api.v1.admin.users({ id: userId })['cancel-deletion'].post()
      if (error) throw error
      return data
    },
    onSuccess: (_data, userId) => {
      queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'userDetail', userId] })
    },
  })
}

export function useExportUser() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await api.v1.admin.users({ id: userId }).export.post()
      if (error) throw error
      return data
    },
  })
}
