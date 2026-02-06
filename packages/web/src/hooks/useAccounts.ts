import { useQuery } from '@tanstack/react-query'
import { listAccounts, useSession } from '../api/auth'

export function useAccounts() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['auth', 'accounts'],
    queryFn: async () => {
      const { data, error } = await listAccounts()
      if (error) throw error
      return data ?? []
    },
    enabled: !!session?.user?.id,
  })
}
