import { useQuery } from '@tanstack/react-query'
import { listAccounts } from '../api/auth'

export function useAccounts() {
  return useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: async () => {
      const { data, error } = await listAccounts()
      if (error) throw error
      return data ?? []
    },
  })
}
