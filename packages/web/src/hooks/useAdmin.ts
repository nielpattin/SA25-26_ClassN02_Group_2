import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import type { AdminRole } from '@kyte/server/src/modules/admin/admin.model'

export const adminKeys = {
  all: ['admin'] as const,
  users: (limit?: number, offset?: number) => [...adminKeys.all, 'users', { limit, offset }] as const,
  audit: (filters: any) => [...adminKeys.all, 'audit', filters] as const,
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
      const previousUsers = queryClient.getQueryData<any[]>(adminKeys.users())
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
      const previousUsers = queryClient.getQueryData<any[]>(adminKeys.users())
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

export function useAuditLogs(filters: any = {}) {
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
